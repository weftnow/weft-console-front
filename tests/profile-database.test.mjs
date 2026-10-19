import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";

async function withEvent(run) {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_TEST_URL, max: 4 });
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
  const userId = randomUUID();
  const organizationId = randomUUID();
  const eventId = randomUUID();
  const membershipId = randomUUID();
  try {
    await pool.query("insert into users (id, display_name) values ($1, 'CSV test organizer')", [userId]);
    await pool.query("insert into organizations (id, name) values ($1, 'CSV test organization')", [organizationId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'organizer', true)", [membershipId, organizationId, userId]);
    await pool.query(`insert into events
      (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at)
      values ($1, $2, $3, 'CSV test event', 'Import persistence test', 'Singapore', ARRAY['Technology'], ARRAY[]::text[], '2026-11-19', '2026-11-19', 'Asia/Singapore', '2026-11-18T16:00:00Z', '2026-11-19T16:00:00Z')`, [eventId, organizationId, userId]);
    await run({ pool, userId, organizationId, eventId, membershipId });
  } finally {
    await pool.query("delete from events where id = $1", [eventId]);
    await pool.query("delete from organization_memberships where id = $1", [membershipId]);
    await pool.query("delete from organizations where id = $1", [organizationId]);
    await pool.query("delete from users where id = $1", [userId]);
    await pool.end();
    if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
  }
}

async function seedGuests(pool, eventId, count) {
  const ids = [];
  for (let position = 0; position < count; position++) {
    const email = `guest${position}@example.com`;
    const { rows } = await pool.query(
      `insert into event_guests (event_id, position, first_name, last_name, email, normalized_email, phone, company, job_position, profile_type, linkedin, guest_type, source)
       values ($1, $2, 'Guest', $3, $4, $4, '', '', '', '', '', 'Attendee', 'manual') returning id`,
      [eventId, position, String(position), email]);
    ids.push(rows[0].id);
  }
  return ids;
}

const changes = (pool, eventId) => pool.query("select kind, guest_ids, reason, actor_id, processed_at from event_matching_changes where event_id = $1 order by created_at, id", [eventId]);
const versions = (pool, guestId) => pool.query("select version, goals, avoid, organizer_only_fields, created_by from event_guest_profile_versions where guest_id = $1 order by version", [guestId]);
const blank = { summary: null, goals: null, offers: null, desiredConnections: null, avoid: null, background: null, linkedinDetails: null, missingDetails: null };
const input = (fields = {}, organizerOnly = [], expectedVersion = 0) => ({ fields: { ...blank, ...fields }, organizerOnly, expectedVersion });

test("guests start without a profile; a save writes the version, the pointer and the change log together", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { saveGuestProfile, getGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    assert.equal((await pool.query("select profile_version from event_guests where id = $1", [guestId])).rows[0].profile_version, 0);
    const empty = await getGuestProfile({ userId, eventId, guestId });
    assert.equal(empty.profile.version, 0);
    assert.equal(empty.completeness.goals, "missing");

    const first = await saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "  Raise a seed round ", avoid: "Competitor X" }, ["avoid"]) });
    assert.equal(first.changed, true);
    assert.equal(first.profile.version, 1);
    assert.equal(first.profile.fields.goals, "Raise a seed round");
    assert.equal((await pool.query("select profile_version from event_guests where id = $1", [guestId])).rows[0].profile_version, 1);
    const log = (await changes(pool, eventId)).rows;
    assert.equal(log.length, 1);
    assert.deepEqual({ kind: log[0].kind, guest_ids: log[0].guest_ids, actor_id: log[0].actor_id, processed_at: log[0].processed_at },
      { kind: "profile_updated", guest_ids: [guestId], actor_id: userId, processed_at: null });

    const read = await getGuestProfile({ userId, eventId, guestId });
    assert.equal(read.profile.version, 1);
    assert.equal(read.profile.savedBy, "CSV test organizer");
    assert.equal(read.completeness.goals, "available");
    assert.doesNotMatch(JSON.stringify(read.summary), /Competitor X/);
    assert.equal(read.profile.fields.avoid, "Competitor X");
  });
});

test("old versions are kept, identical saves are no-ops and blank fields are stored as null", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { saveGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    await saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "v1 goal" }) });
    const repeated = await saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "v1 goal" }, [], 1) });
    assert.equal(repeated.changed, false);
    const second = await saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "v2 goal", offers: "   " }, [], 1) });
    assert.equal(second.profile.version, 2);
    const rows = (await versions(pool, guestId)).rows;
    assert.deepEqual(rows.map((row) => [row.version, row.goals]), [[1, "v1 goal"], [2, "v2 goal"]]);
    assert.equal((await pool.query("select count(*)::int n from event_guest_profile_versions where guest_id = $1 and offers is not null", [guestId])).rows[0].n, 0);
    assert.equal((await changes(pool, eventId)).rows.length, 2);
    const empty = await saveGuestProfile({ userId, eventId, guestId: (await seedGuests2(pool, eventId)), data: input() });
    assert.equal(empty.changed, false, "saving nothing never creates a version");
  });
});

async function seedGuests2(pool, eventId) {
  const { rows } = await pool.query(
    `insert into event_guests (event_id, position, first_name, last_name, email, normalized_email, phone, company, job_position, profile_type, linkedin, guest_type, source)
     values ($1, 99, 'Extra', 'Guest', 'extra@example.com', 'extra@example.com', '', '', '', '', '', 'Attendee', 'manual') returning id`, [eventId]);
  return rows[0].id;
}

test("a stale version returns the latest profile and writes nothing", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { saveGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    await saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "first" }) });
    await assert.rejects(
      saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "stale edit" }, [], 0) }),
      (error) => error.code === "CONFLICT" && error.latest.version === 1 && error.latest.fields.goals === "first",
    );
    assert.equal((await versions(pool, guestId)).rows.length, 1);
    assert.equal((await changes(pool, eventId)).rows.length, 1);
  });
});

test("concurrent saves from the same version: one wins, the other gets a conflict", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { saveGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    const results = await Promise.allSettled([
      saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "tab one" }) }),
      saveGuestProfile({ userId, eventId, guestId, data: input({ goals: "tab two" }) }),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, "CONFLICT");
    assert.equal((await versions(pool, guestId)).rows.length, 1);
    assert.equal((await changes(pool, eventId)).rows.length, 1);
    assert.equal((await pool.query("select profile_version from event_guests where id = $1", [guestId])).rows[0].profile_version, 1);
  });
});

test("event staff cannot read or save profiles, and nothing is written", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, organizationId, eventId }) => {
    const { saveGuestProfile, getGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    const staffId = randomUUID();
    const staffMembershipId = randomUUID();
    await pool.query("insert into users (id, display_name) values ($1, 'Staff')", [staffId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'staff', true)", [staffMembershipId, organizationId, staffId]);
    try {
      await assert.rejects(saveGuestProfile({ userId: staffId, eventId, guestId, data: input({ goals: "x" }) }), { code: "FORBIDDEN" });
      await assert.rejects(getGuestProfile({ userId: staffId, eventId, guestId }), { code: "FORBIDDEN" });
      assert.equal((await versions(pool, guestId)).rows.length, 0);
      assert.equal((await changes(pool, eventId)).rows.length, 0);
    } finally {
      await pool.query("delete from organization_memberships where id = $1", [staffMembershipId]);
      await pool.query("delete from users where id = $1", [staffId]);
    }
  });
});

test("a guest from another event is not found, and the database rejects invalid version rows", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { saveGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    await assert.rejects(saveGuestProfile({ userId, eventId, guestId: randomUUID(), data: input({ goals: "x" }) }), { code: "NOT_FOUND" });
    const insert = (columns, values) => pool.query(`insert into event_guest_profile_versions (event_id, guest_id, version, created_by, ${columns}) values ($1, $2, 1, $3, ${values})`, [eventId, guestId, userId]);
    await assert.rejects(insert("goals", "''"), { code: "23514" });
    await assert.rejects(insert("goals", "' padded '"), { code: "23514" });
    await assert.rejects(insert("summary", "repeat('x', 501)"), { code: "23514" });
    await assert.rejects(insert("organizer_only_fields", "ARRAY['summary']"), { code: "23514" });
    await assert.rejects(pool.query("insert into event_guest_profile_versions (event_id, guest_id, version, created_by) values ($1, $2, 1, $3)", [randomUUID(), guestId, userId]), { code: "23503" });
  });
});

test("Event Detail carries a light profile summary per guest: version and completeness, no profile text", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, organizationId, eventId }) => {
    const { saveGuestProfile } = loadTs("src/modules/attendees/server/profile-service.ts");
    const { findById } = loadTs("src/modules/events/server/repository.ts");
    const { eventDetailDtoSchema } = loadTs("src/modules/events/event-dto.ts");
    const [saved, untouched] = await seedGuests(pool, eventId, 2);
    await pool.query("update event_guests set linkedin = 'linkedin.com/in/ada' where id = $1", [untouched]);
    await saveGuestProfile({ userId, eventId, guestId: saved, data: input({ goals: "Secret goal text", linkedinDetails: "VP at Acme" }, ["goals"]) });
    const detail = await findById(eventId, organizationId);
    assert.equal(eventDetailDtoSchema.safeParse(detail).success, true);
    const byId = new Map(detail.attendees.guests.map((guest) => [guest.id, guest.profile]));
    assert.deepEqual(byId.get(saved), { version: 1, completeness: { goals: "available", offers: "missing", desiredConnections: "missing", background: "missing", linkedin: "available" } });
    assert.deepEqual(byId.get(untouched), { version: 0, completeness: { goals: "missing", offers: "missing", desiredConnections: "missing", background: "missing", linkedin: "url_only" } });
    assert.doesNotMatch(JSON.stringify(detail), /Secret goal text/);
  });
});
