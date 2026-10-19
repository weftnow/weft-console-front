import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";

// Requires migration 0012 on the target. Same isolation rule as the F03 suite: loopback weft_f07_scratch or the
// direct development Neon weft_console_test, never production. Fixtures use random IDs and clean up their rows.
test("F07 imports, corrections and identity links each write exactly one change row; no-ops write none", { skip: !enabled }, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const url = new URL(process.env.DATABASE_TEST_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localScratch = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && database === "weft_f07_scratch";
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ? new URL(process.env.DATABASE_MIGRATION_URL) : null;
  const configuredNeonDev = url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.") && database === "weft_console_test" &&
    process.env.WEFT_MIGRATION_TARGET === "development" && migrationUrl?.hostname === url.hostname &&
    !migrationUrl.hostname.includes("-pooler.") && decodeURIComponent(migrationUrl.pathname.slice(1)) === database;
  assert.ok(localScratch || configuredNeonDev, "F07 database tests require loopback weft_f07_scratch or direct development weft_console_test");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  assert.equal((await pool.query("select current_database() as db")).rows[0]?.db, database);
  const previousUrl = process.env.DATABASE_URL; process.env.DATABASE_URL = url.toString();
  const ownerId = randomUUID(), operatorId = randomUUID(), orgId = randomUUID();
  const membershipIds = [randomUUID(), randomUUID()];
  const eventId = randomUUID();
  const guestIds = [randomUUID(), randomUUID()];
  const personIds = guestIds.map(() => randomUUID());
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const { replaceAttendee, linkAttendees } = loadTs("src/modules/events/server/attendee-record-service.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const changes = async () => (await pool.query("select kind, guest_ids, actor_id, processed_at from event_matching_changes where event_id = $1 order by created_at, id", [eventId])).rows;
  const base = {
    expectedRevision: 1, firstName: "Grace", lastName: "Hopper", email: "grace@example.com",
    phone: "+1 415 555 0100", company: "Navy", position: "Admiral", profileType: "Executive", guestType: "VIP", linkedin: "",
  };
  try {
    await pool.query("insert into users (id, display_name) values ($1,'F07 owner'),($2,'F07 operator')", [ownerId, operatorId]);
    await pool.query("insert into organizations (id, name) values ($1,'F07 organization')", [orgId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1,$2,$3,'owner',true),($4,$2,$5,'staff',true)", [membershipIds[0], orgId, ownerId, membershipIds[1], operatorId]);
    await pool.query("insert into events (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at) values ($1,$2,$3,'F07 event','Disposable F07 fixture','Singapore',ARRAY['Technology'],ARRAY[]::text[],'2026-11-19','2026-11-19','Asia/Singapore','2026-11-18T16:00:00Z','2026-11-19T16:00:00Z')", [eventId, orgId, ownerId]);

    // Imports: one event-level row per import that stored guests; replays and empty imports write none.
    const csv = { fileName: "f07.csv", csvText: "First Name,Email\nAda,ada@example.com\nBea,bea@example.com\n" };
    const imported = await importAttendees({ userId: ownerId, eventId, data: csv });
    assert.equal(imported.replayed, false);
    let rows = await changes();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, "attendees_imported");
    assert.deepEqual(rows[0].guest_ids, [], "an event-level change carries no guests");
    assert.equal(rows[0].actor_id, ownerId);
    assert.equal(rows[0].processed_at, null);
    assert.equal((await importAttendees({ userId: ownerId, eventId, data: csv })).replayed, true);
    assert.equal((await changes()).length, 1, "a replayed import writes no change row");
    await assert.rejects(() => importAttendees({ userId: operatorId, eventId, data: { fileName: "denied.csv", csvText: "First Name,Email\nZed,zed@example.com\n" } }));
    assert.equal((await changes()).length, 1, "a denied import writes no change row");
    await pool.query("delete from event_matching_changes where event_id = $1", [eventId]);
    await pool.query("delete from event_guests where event_id = $1", [eventId]);
    await pool.query("delete from event_people where event_id = $1", [eventId]);
    await pool.query("delete from event_attendee_imports where event_id = $1", [eventId]);
    await pool.query("insert into event_people (id,event_id) values ($1,$3),($2,$3)", [...personIds, eventId]);
    const guestSql = "insert into event_guests (id,event_id,person_id,revision,position,first_name,last_name,email,normalized_email,phone,normalized_phone,company,job_position,profile_type,linkedin,guest_type,source) values ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,'Example','Director','VIP','', 'VIP','manual')";
    await pool.query(guestSql, [guestIds[0], eventId, personIds[0], 0, "Ada", "Lovelace", "ada@example.com", "ada@example.com", "+1 415 555 0100", "+14155550100"]);
    await pool.query(guestSql, [guestIds[1], eventId, personIds[1], 1, "Ada", "Byron", "ADA@example.com", "ada@example.com", "+1 (415) 555-0100", "+14155550100"]);

    // Corrections: one row naming the guest; a stale revision, a missing guest and a denied actor write none.
    await replaceAttendee({ eventId, guestId: guestIds[0], userId: ownerId, data: base });
    rows = await changes();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].kind, "attendee_corrected");
    assert.deepEqual(rows[0].guest_ids, [guestIds[0]]);
    await assert.rejects(() => replaceAttendee({ eventId, guestId: guestIds[0], userId: ownerId, data: base }), { code: "CONFLICT" });
    await assert.rejects(() => replaceAttendee({ eventId, guestId: randomUUID(), userId: ownerId, data: base }), { code: "NOT_FOUND" });
    await assert.rejects(() => replaceAttendee({ eventId, guestId: guestIds[0], userId: operatorId, data: { ...base, expectedRevision: 2 } }), { code: "FORBIDDEN" });
    assert.equal((await changes()).length, 1, "conflicts and denials write no change row");

    // Links: one event-level row; linking already-linked records writes none.
    assert.equal((await linkAttendees({ eventId, userId: ownerId, data: { duplicateGuestId: guestIds[1], canonicalGuestId: guestIds[0] } })).linked, true);
    rows = await changes();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].kind, "identity_linked");
    assert.deepEqual(rows[1].guest_ids, []);
    assert.equal((await linkAttendees({ eventId, userId: ownerId, data: { duplicateGuestId: guestIds[1], canonicalGuestId: guestIds[0] } })).linked, false);
    assert.equal((await changes()).length, 2, "an already-linked pair writes no change row");

    // The relaxed check still rejects malformed rows.
    await assert.rejects(() => pool.query("insert into event_matching_changes (event_id, kind, guest_ids, actor_id) values ($1,'attendees_imported',ARRAY[$2]::uuid[],$3)", [eventId, guestIds[0], ownerId]), /event_matching_changes_guests_valid/);
    await assert.rejects(() => pool.query("insert into event_matching_changes (event_id, kind, guest_ids, actor_id) values ($1,'guest_excluded',ARRAY[]::uuid[],$2)", [eventId, ownerId]), /event_matching_changes_guests_valid/);
    await assert.rejects(() => pool.query("insert into event_matching_changes (event_id, kind, guest_ids, actor_id) values ($1,'identity_linked',ARRAY[$2]::uuid[],$3)", [eventId, guestIds[0], ownerId]), /event_matching_changes_guests_valid/);
  } finally {
    await pool.query("delete from events where id = $1", [eventId]);
    await pool.query("delete from organization_memberships where id = any($1::uuid[])", [membershipIds]);
    await pool.query("delete from organizations where id = $1", [orgId]);
    await pool.query("delete from users where id = any($1::uuid[])", [[ownerId, operatorId]]);
    await closeDatabase(); await pool.end();
    if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
  }
});
