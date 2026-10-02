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

const guestValues = (eventId, position, email, firstName = "Seed") => ({
  eventId, position, firstName, lastName: "Guest", email, normalizedEmail: email,
  phone: "", company: "", jobPosition: "", profileType: "", linkedin: "",
  guestType: "Attendee", source: "manual", importId: null,
});

test("concurrent identical imports commit one batch and persist a fresh readable roster", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
    const data = { fileName: "no-email.csv", csvText: "First Name,Email\nNo Email,\n" };
    const results = await Promise.all([
      importAttendees({ userId, eventId, data }),
      importAttendees({ userId, eventId, data }),
    ]);
    assert.equal(results.filter((result) => !result.replayed).length, 1);
    assert.equal(results.filter((result) => result.replayed).length, 1);
    assert.equal((await pool.query("select count(*)::integer as count from event_attendee_imports where event_id = $1", [eventId])).rows[0].count, 1);
    assert.equal((await pool.query("select count(*)::integer as count from event_guests where event_id = $1", [eventId])).rows[0].count, 1);
    const { getEvent } = loadTs("src/modules/events/server/service.ts");
    const fresh = await getEvent({ userId, eventId });
    assert.equal(fresh.attendees.importCount, 1);
    assert.equal(fresh.attendees.guests.length, 1);
    assert.equal(fresh.attendees.guests[0].importId, results[0].import.id);
  });
});

test("overlapping email batches skip existing manual details and never overwrite provenance", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
    await pool.query("insert into event_guests (event_id, position, first_name, last_name, email, normalized_email, phone, company, job_position, profile_type, linkedin, guest_type, source) values ($1, 0, 'Original', 'VIP', 'ada@example.com', 'ada@example.com', '555', 'Original Co', 'Founder', 'Founders', '', 'VIP', 'manual')", [eventId]);
    const result = await importAttendees({ userId, eventId, data: { fileName: "overlap.csv", csvText: "First Name,Email,Guest Type,Company\nChanged,ada@example.com,Attendee,Changed Co\nGrace,grace@example.com,Attendee,Grace Co\n" } });
    assert.equal(result.import.storedCount, 1);
    assert.equal(result.import.duplicateCount, 1);
    const rows = await pool.query("select first_name, guest_type, company, source from event_guests where event_id = $1 and normalized_email = 'ada@example.com'", [eventId]);
    assert.deepEqual(rows.rows[0], { first_name: "Original", guest_type: "VIP", company: "Original Co", source: "manual" });
  });
});

test("two near-capacity imports serialize and cannot exceed 2,000 guests", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId }) => {
    const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
    const { eventGuests } = loadTs("src/infrastructure/database/schema/events.ts");
    const { getDatabase } = loadTs("src/infrastructure/database/client.ts");
    const seeded = Array.from({ length: 1999 }, (_, index) => guestValues(eventId, index, `seed${index}@example.com`));
    await getDatabase().insert(eventGuests).values(seeded);
    const inputs = ["New One,new-one@example.com", "New Two,new-two@example.com"].map((line, index) => ({
      fileName: `capacity-${index}.csv`, csvText: `First Name,Email\n${line}\n`,
    }));
    const results = await Promise.allSettled(inputs.map((data) => importAttendees({ userId, eventId, data })));
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected" && result.reason.code === "VALIDATION_ERROR").length, 1);
    assert.equal((await pool.query("select count(*)::integer as count from event_guests where event_id = $1", [eventId])).rows[0].count, 2000);
  });
});

test("locked import rechecks revoked membership and rolls back a failed guest insert", { skip: !enabled }, async () => {
  await withEvent(async ({ pool, userId, eventId, membershipId }) => {
    const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
    const { withLockedEventRoster } = loadTs("src/modules/events/server/attendee-import-repository.ts");
    const eventRepository = loadTs("src/modules/events/server/repository.ts");
    const data = { fileName: "revoked.csv", csvText: "First Name,Email\nAda,ada@example.com\n" };
    await assert.rejects(importAttendees({ userId, eventId, data }, {
      findOrganizationId: eventRepository.findOrganizationId,
      requireCreator: async () => { await pool.query("update organization_memberships set active = false where id = $1", [membershipId]); },
      withLockedEventRoster,
    }), (error) => error.code === "FORBIDDEN");

    await pool.query("update organization_memberships set active = true where id = $1", [membershipId]);
    const beforeEvent = await pool.query("select updated_at from events where id = $1", [eventId]);
    const beforeImports = await pool.query("select count(*)::integer as count from event_attendee_imports where event_id = $1", [eventId]);
    const { withLockedEventRoster: appendLockedRoster } = loadTs("src/modules/events/server/attendee-import-repository.ts");
    await assert.rejects(appendLockedRoster({
      userId, eventId,
      prepared: { fileName: "broken.csv", contentHash: "a".repeat(64), importedCount: 1, blankCount: 0, vipCount: 0, sponsorCount: 0,
        guests: [{ firstName: "", lastName: "", email: "bad@example.com", phone: "", company: "", position: "", profileType: "", linkedin: "", guestType: "Attendee", source: "csv" }],
      },
    }, () => ({
      kind: "append", firstPosition: 0,
      guests: [{ firstName: "", lastName: "", email: "bad@example.com", phone: "", company: "", position: "", profileType: "", linkedin: "", guestType: "Attendee", source: "csv" }],
      counts: { importedCount: 1, storedCount: 1, duplicateCount: 0, blankCount: 0, vipCount: 0, sponsorCount: 0 },
    })));
    const afterEvent = await pool.query("select updated_at from events where id = $1", [eventId]);
    const afterImports = await pool.query("select count(*)::integer as count from event_attendee_imports where event_id = $1", [eventId]);
    assert.deepEqual(afterImports.rows, beforeImports.rows);
    assert.deepEqual(afterEvent.rows, beforeEvent.rows);
  });
});
