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

test("new guests are included at version 1 and exclusion writes the guest and the change log together", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { updateGuestParticipation } = loadTs("src/modules/attendees/server/networking-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    const initial = (await pool.query("select networking_status, networking_version from event_guests where id = $1", [guestId])).rows[0];
    assert.deepEqual(initial, { networking_status: "included", networking_version: 1 });

    const excluded = await updateGuestParticipation({ userId, eventId, guestId, data: { status: "excluded", reason: "guest_request", expectedVersion: 1 } });
    assert.equal(excluded.changed, true);
    assert.equal(excluded.participation.version, 2);
    const row = (await pool.query("select networking_status, networking_excluded_by, networking_exclusion_reason from event_guests where id = $1", [guestId])).rows[0];
    assert.deepEqual(row, { networking_status: "excluded", networking_excluded_by: userId, networking_exclusion_reason: "guest_request" });
    const log = (await changes(pool, eventId)).rows;
    assert.equal(log.length, 1);
    assert.deepEqual({ kind: log[0].kind, guest_ids: log[0].guest_ids, reason: log[0].reason, actor_id: log[0].actor_id, processed_at: log[0].processed_at },
      { kind: "guest_excluded", guest_ids: [guestId], reason: "guest_request", actor_id: userId, processed_at: null });

    const repeated = await updateGuestParticipation({ userId, eventId, guestId, data: { status: "excluded", reason: "other", expectedVersion: 2 } });
    assert.equal(repeated.changed, false);
    assert.equal((await changes(pool, eventId)).rows.length, 1);

    const restored = await updateGuestParticipation({ userId, eventId, guestId, data: { status: "included", expectedVersion: 2 } });
    assert.equal(restored.participation.status, "included");
    assert.equal(restored.participation.version, 3);
    assert.deepEqual((await changes(pool, eventId)).rows.map((entry) => entry.kind), ["guest_excluded", "guest_restored"]);
  });
});

test("a stale version returns the latest participation and writes nothing", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { updateGuestParticipation } = loadTs("src/modules/attendees/server/networking-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    await updateGuestParticipation({ userId, eventId, guestId, data: { status: "excluded", reason: "other", expectedVersion: 1 } });
    await assert.rejects(
      updateGuestParticipation({ userId, eventId, guestId, data: { status: "included", expectedVersion: 1 } }),
      (error) => error.code === "CONFLICT" && error.latest.status === "excluded" && error.latest.version === 2,
    );
    assert.equal((await changes(pool, eventId)).rows.length, 1);
  });
});

test("concurrent identical exclusions write once; the loser is a no-op", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { updateGuestParticipation } = loadTs("src/modules/attendees/server/networking-service.ts");
    const [guestId] = await seedGuests(pool, eventId, 1);
    const data = { status: "excluded", reason: "organizer_decision", expectedVersion: 1 };
    const results = await Promise.all([updateGuestParticipation({ userId, eventId, guestId, data }), updateGuestParticipation({ userId, eventId, guestId, data })]);
    assert.equal(results.filter((result) => result.changed).length, 1);
    assert.equal((await changes(pool, eventId)).rows.length, 1);
    assert.equal((await pool.query("select networking_version from event_guests where id = $1", [guestId])).rows[0].networking_version, 2);
  });
});

test("event staff cannot exclude guests or add pairs, and nothing is written", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, organizationId, eventId }) => {
    const { updateGuestParticipation, addMatchBlock } = loadTs("src/modules/attendees/server/networking-service.ts");
    const [a, b] = await seedGuests(pool, eventId, 2);
    const staffId = randomUUID();
    const staffMembershipId = randomUUID();
    await pool.query("insert into users (id, display_name) values ($1, 'Staff')", [staffId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'staff', true)", [staffMembershipId, organizationId, staffId]);
    try {
      await assert.rejects(updateGuestParticipation({ userId: staffId, eventId, guestId: a, data: { status: "excluded", reason: "other", expectedVersion: 1 } }), { code: "FORBIDDEN" });
      await assert.rejects(addMatchBlock({ userId: staffId, eventId, data: { guestIds: [a, b] } }), { code: "FORBIDDEN" });
      assert.equal((await changes(pool, eventId)).rows.length, 0);
    } finally {
      await pool.query("delete from organization_memberships where id = $1", [staffMembershipId]);
      await pool.query("delete from users where id = $1", [staffId]);
    }
  });
});

test("do-not-match pairs are canonical, idempotent in either order and removable", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { addMatchBlock, removeMatchBlock } = loadTs("src/modules/attendees/server/networking-service.ts");
    const [a, b] = await seedGuests(pool, eventId, 2);
    const [low, high] = a < b ? [a, b] : [b, a];
    const first = await addMatchBlock({ userId, eventId, data: { guestIds: [high, low], reason: "Competitors" } });
    assert.equal(first.created, true);
    assert.deepEqual(first.matchBlock.guestIds, [low, high]);
    const second = await addMatchBlock({ userId, eventId, data: { guestIds: [low, high] } });
    assert.equal(second.created, false);
    assert.equal(second.matchBlock.id, first.matchBlock.id);
    assert.equal((await pool.query("select count(*)::integer as count from event_guest_match_blocks where event_id = $1", [eventId])).rows[0].count, 1);
    await assert.rejects(addMatchBlock({ userId, eventId, data: { guestIds: [low, randomUUID()] } }), { code: "VALIDATION_ERROR" });
    await assert.rejects(pool.query("insert into event_guest_match_blocks (event_id, guest_low_id, guest_high_id, created_by) values ($1, $2, $2, $3)", [eventId, low, userId]));

    await removeMatchBlock({ userId, eventId, blockId: first.matchBlock.id });
    await assert.rejects(removeMatchBlock({ userId, eventId, blockId: first.matchBlock.id }), { code: "NOT_FOUND" });
    assert.deepEqual((await changes(pool, eventId)).rows.map((entry) => entry.kind), ["match_block_added", "match_block_removed"]);
  });
});

test("an excluded guest survives re-import and keeps their restrictions", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { updateGuestParticipation, addMatchBlock } = loadTs("src/modules/attendees/server/networking-service.ts");
    const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
    const [a, b] = await seedGuests(pool, eventId, 2);
    await addMatchBlock({ userId, eventId, data: { guestIds: [a, b] } });
    await updateGuestParticipation({ userId, eventId, guestId: a, data: { status: "excluded", reason: "not_attending", expectedVersion: 1 } });
    const result = await importAttendees({ userId, eventId, data: { fileName: "again.csv", csvText: "First Name,Email\nGuest,guest0@example.com\nNew,new@example.com\n" } });
    assert.equal(result.import.duplicateCount, 1);
    const rows = (await pool.query("select normalized_email, networking_status, networking_version from event_guests where event_id = $1 order by position", [eventId])).rows;
    assert.deepEqual(rows.map((row) => [row.normalized_email, row.networking_status]), [["guest0@example.com", "excluded"], ["guest1@example.com", "included"], ["new@example.com", "included"]]);
    assert.equal((await pool.query("select count(*)::integer as count from event_guest_match_blocks where event_id = $1", [eventId])).rows[0].count, 1);
  });
});

test("the exclusion check constraint rejects half-excluded guests", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, eventId }) => {
    const [guestId] = await seedGuests(pool, eventId, 1);
    await assert.rejects(pool.query("update event_guests set networking_status = 'excluded' where id = $1", [guestId]), /event_guests_networking_valid/);
  });
});
