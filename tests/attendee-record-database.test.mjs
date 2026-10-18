import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";

test("F03 corrections and event-local identity links preserve guest/import rows and enforce role/revision rules", { skip: !enabled }, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const url = new URL(process.env.DATABASE_TEST_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localScratch = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && database === "weft_f03_scratch";
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ? new URL(process.env.DATABASE_MIGRATION_URL) : null;
  const configuredNeonDev = url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.") && database === "weft_console_test" &&
    process.env.WEFT_MIGRATION_TARGET === "development" && migrationUrl?.hostname === url.hostname &&
    !migrationUrl.hostname.includes("-pooler.") && decodeURIComponent(migrationUrl.pathname.slice(1)) === database;
  assert.ok(localScratch || configuredNeonDev, "F03 database tests require loopback weft_f03_scratch or direct development weft_console_test");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  assert.equal((await pool.query("select current_database() as db")).rows[0]?.db, database);
  const previousUrl = process.env.DATABASE_URL; process.env.DATABASE_URL = url.toString();
  const ownerId = randomUUID(), organizerId = randomUUID(), operatorId = randomUUID(), wefterId = randomUUID(), sponsorId = randomUUID(), inactiveId = randomUUID(), outsiderId = randomUUID(), attendeeId = randomUUID();
  const orgId = randomUUID(), otherOrgId = randomUUID();
  const membershipIds = Array.from({ length: 7 }, () => randomUUID());
  const otherMembershipId = randomUUID();
  const eventId = randomUUID(), otherEventId = randomUUID(), outsiderEventId = randomUUID();
  const guestIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const personIds = guestIds.map(() => randomUUID());
  const importId = randomUUID();
  const { replaceAttendee, findAttendeeCandidates, linkAttendees } = loadTs("src/modules/events/server/attendee-record-service.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const base = {
    expectedRevision: 1, firstName: "Grace", lastName: "Hopper", email: "grace@example.com",
    phone: "+1 415 555 0100", company: "Navy", position: "Admiral", profileType: "Executive",
    guestType: "VIP", linkedin: "",
  };
  try {
    await pool.query("insert into users (id, display_name) values ($1,'F03 owner'),($2,'F03 organizer'),($3,'F03 operator'),($4,'F03 wefter'),($5,'F03 sponsor'),($6,'F03 inactive'),($7,'F03 outsider'),($8,'F03 attendee without Console membership')", [ownerId, organizerId, operatorId, wefterId, sponsorId, inactiveId, outsiderId, attendeeId]);
    await pool.query("insert into organizations (id, name) values ($1,'F03 organization'),($2,'F03 other organization')", [orgId, otherOrgId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1,$2,$3,'owner',true),($4,$2,$5,'organizer',true),($6,$2,$7,'staff',true),($8,$2,$9,'staff',true),($10,$2,$11,'sponsor',true),($12,$2,$13,'owner',false),($14,$15,$16,'owner',true)",
      [membershipIds[0], orgId, ownerId, membershipIds[1], organizerId, membershipIds[2], operatorId, membershipIds[3], wefterId, membershipIds[4], sponsorId, membershipIds[5], inactiveId, otherMembershipId, otherOrgId, outsiderId]);
    const eventSql = "insert into events (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at) values ($1,$2,$3,'F03 event','Disposable F03 fixture','Singapore',ARRAY['Technology'],ARRAY[]::text[],'2026-11-19','2026-11-19','Asia/Singapore','2026-11-18T16:00:00Z','2026-11-19T16:00:00Z')";
    await pool.query(eventSql, [eventId, orgId, ownerId]); await pool.query(eventSql, [otherEventId, orgId, ownerId]); await pool.query(eventSql, [outsiderEventId, otherOrgId, outsiderId]);
    await pool.query("insert into event_staff (event_id, organization_id, membership_id, console_access) values ($1,$2,$3,'operator'),($1,$2,$4,'wefter')", [eventId, orgId, membershipIds[2], membershipIds[3]]);
    await pool.query("insert into event_attendee_imports (id,event_id,imported_by,file_name,imported_count,stored_count,duplicate_count,blank_count,vip_count,sponsor_count) values ($1,$2,$3,'source.csv',1,1,0,0,1,0)", [importId, eventId, ownerId]);
    await pool.query("insert into event_people (id,event_id) values ($1,$5),($2,$5),($3,$5),($4,$6)", [...personIds, eventId, otherEventId]);
    const guestSql = "insert into event_guests (id,event_id,person_id,revision,position,first_name,last_name,email,normalized_email,phone,normalized_phone,company,job_position,profile_type,linkedin,guest_type,source,import_id) values ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,'Example','Director','VIP','', 'VIP',$11,$12)";
    await pool.query(guestSql, [guestIds[0], eventId, personIds[0], 0, "Ada", "Lovelace", "ada@example.com", "ada@example.com", "+1 415 555 0100", "+14155550100", "csv", importId]);
    await pool.query(guestSql, [guestIds[1], eventId, personIds[1], 1, "Ada", "Byron", "ADA@example.com", "ada@example.com", "+1 (415) 555-0100", "+14155550100", "manual", null]);
    await pool.query(guestSql, [guestIds[2], eventId, personIds[2], 2, "Ada", "Byron", "", null, "", null, "manual", null]);
    await pool.query(guestSql, [guestIds[3], otherEventId, personIds[3], 0, "Ada", "Across", "ada@example.com", "ada@example.com", "+14155550100", "+14155550100", "manual", null]);

    const candidates = await findAttendeeCandidates({ eventId, guestId: guestIds[0], userId: ownerId });
    assert.equal(candidates.length, 1, "only the exact email/phone guest is suggested; name-only guest is excluded");
    assert.deepEqual(candidates[0].reasons, ["email", "phone"]);
    assert.deepEqual(await findAttendeeCandidates({ eventId, guestId: guestIds[2], userId: ownerId }), [], "name similarity and invalid/missing contacts produce no candidates");
    for (const userId of [operatorId, wefterId, sponsorId, inactiveId, outsiderId, attendeeId]) {
      await assert.rejects(() => findAttendeeCandidates({ eventId, guestId: guestIds[0], userId }), { code: "FORBIDDEN" });
      await assert.rejects(() => replaceAttendee({ eventId, guestId: guestIds[0], userId, data: base }), { code: "FORBIDDEN" });
      await assert.rejects(() => linkAttendees({ eventId, userId, data: { duplicateGuestId: guestIds[1], canonicalGuestId: guestIds[0] } }), { code: "FORBIDDEN" });
    }
    await assert.rejects(() => linkAttendees({ eventId, userId: ownerId, data: { duplicateGuestId: guestIds[0], canonicalGuestId: guestIds[3] } }), /not found/i, "cross-event guest IDs cannot be linked");
    assert.equal((await replaceAttendee({ eventId, guestId: guestIds[0], userId: organizerId, data: { ...base, company: "Updated company" } })).revision, 2);
    await assert.rejects(() => replaceAttendee({ eventId, guestId: guestIds[0], userId: ownerId, data: base }), (error) => error.details?.kind === "STALE_VERSION" && error.details.current.revision === 2);
    const raced = await Promise.allSettled([
      replaceAttendee({ eventId, guestId: guestIds[0], userId: ownerId, data: { ...base, expectedRevision: 2, company: "Race one" } }),
      replaceAttendee({ eventId, guestId: guestIds[0], userId: organizerId, data: { ...base, expectedRevision: 2, company: "Race two" } }),
    ]);
    assert.equal(raced.filter((row) => row.status === "fulfilled" && row.value.revision === 3).length, 1, "one same-revision replacement wins");
    assert.equal(raced.filter((row) => row.status === "rejected" && row.reason.details?.kind === "STALE_VERSION" && row.reason.details.current.revision === 3).length, 1, "the concurrent replacement receives the current snapshot");

    const linked = await linkAttendees({ eventId, userId: ownerId, data: { duplicateGuestId: guestIds[1], canonicalGuestId: guestIds[0] } });
    assert.equal(linked.linked, true);
    const rows = (await pool.query("select id,person_id,revision,source,import_id from event_guests where id = any($1::uuid[]) order by id", [[guestIds[0], guestIds[1]]])).rows;
    assert.equal(new Set(rows.map((row) => row.person_id)).size, 1, "the explicit link is event-local and updates the identity group");
    assert.equal(rows.find((row) => row.id === guestIds[0]).revision, 3, "identity links do not consume replacement revisions");
    assert.equal(rows.find((row) => row.id === guestIds[0]).source, "csv");
    assert.equal(rows.find((row) => row.id === guestIds[0]).import_id, importId, "import provenance remains intact");
    await assert.rejects(() => linkAttendees({ eventId: otherEventId, userId: ownerId, data: { duplicateGuestId: guestIds[0], canonicalGuestId: guestIds[3] } }), /not found/i);
    await assert.rejects(() => findAttendeeCandidates({ eventId: outsiderEventId, guestId: guestIds[3], userId: ownerId }), /access/i, "cross-organization reads are denied");
  } finally {
    await pool.query("delete from events where id = any($1::uuid[])", [[eventId, otherEventId, outsiderEventId]]);
    await pool.query("delete from organization_memberships where id = any($1::uuid[])", [[...membershipIds, otherMembershipId]]);
    await pool.query("delete from organizations where id = any($1::uuid[])", [[orgId, otherOrgId]]);
    await pool.query("delete from users where id = any($1::uuid[])", [[ownerId, organizerId, operatorId, wefterId, sponsorId, inactiveId, outsiderId, attendeeId]]);
    await closeDatabase(); await pool.end();
    if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
  }
});
