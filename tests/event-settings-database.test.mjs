import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";
test("F02 settings revisions and Wefter schedules serialize with F01 access edits", { skip: !enabled }, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const url = new URL(process.env.DATABASE_TEST_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localScratch = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && database === "weft_f02_scratch";
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ? new URL(process.env.DATABASE_MIGRATION_URL) : null;
  const configuredNeonDev = url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.") && database === "weft_console_test" &&
    process.env.WEFT_MIGRATION_TARGET === "development" && migrationUrl?.hostname === url.hostname &&
    !migrationUrl.hostname.includes("-pooler.") && decodeURIComponent(migrationUrl.pathname.slice(1)) === database;
  assert.ok(localScratch || configuredNeonDev,
    "F02 database tests require loopback weft_f02_scratch or the direct configured development Neon test database");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url.toString(), max: 3 });
  assert.equal((await pool.query("select current_database() as db")).rows[0]?.db, database);
  const previousUrl = process.env.DATABASE_URL; process.env.DATABASE_URL = url.toString();
  const ownerId = randomUUID(), staffId = randomUUID(), staffTwoId = randomUUID(), staffThreeId = randomUUID(), organizerId = randomUUID(), sponsorId = randomUUID(), inactiveId = randomUUID(), outsiderId = randomUUID();
  const organizationId = randomUUID(), outsiderOrganizationId = randomUUID(), ownerMembershipId = randomUUID(), staffMembershipId = randomUUID(), staffTwoMembershipId = randomUUID(), staffThreeMembershipId = randomUUID(), organizerMembershipId = randomUUID(), sponsorMembershipId = randomUUID(), inactiveMembershipId = randomUUID(), outsiderMembershipId = randomUUID(), eventId = randomUUID();
  const { getSettings, listWefters, getOwnWefterHours, saveSettings, saveWefter } = loadTs("src/modules/events/server/settings-repository.ts");
  const { saveEventAccess } = loadTs("src/modules/events/server/access-repository.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const settings = { networkingWindows: [{ startsAt: "2026-11-18T17:00:00.000Z", endsAt: "2026-11-18T18:00:00.000Z" }], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };
  const availabilityWindows = [{ startsAt: "2026-11-18T18:00:00.000Z", endsAt: "2026-11-18T19:00:00.000Z" }];
  try {
    await pool.query("insert into users (id, display_name) values ($1, 'F02 owner'), ($2, 'F02 staff 1'), ($3, 'F02 staff 2'), ($4, 'F02 staff 3'), ($5, 'F02 organizer'), ($6, 'F02 sponsor'), ($7, 'F02 inactive owner'), ($8, 'F02 outsider')", [ownerId, staffId, staffTwoId, staffThreeId, organizerId, sponsorId, inactiveId, outsiderId]);
    await pool.query("insert into organizations (id, name) values ($1, 'F02 scratch organization'), ($2, 'F02 outsider organization')", [organizationId, outsiderOrganizationId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'owner', true), ($4, $2, $5, 'staff', true), ($6, $2, $7, 'staff', true), ($8, $2, $9, 'staff', true), ($10, $2, $11, 'organizer', true), ($12, $2, $13, 'sponsor', true), ($14, $2, $15, 'owner', false), ($16, $17, $18, 'owner', true)", [ownerMembershipId, organizationId, ownerId, staffMembershipId, staffId, staffTwoMembershipId, staffTwoId, staffThreeMembershipId, staffThreeId, organizerMembershipId, organizerId, sponsorMembershipId, sponsorId, inactiveMembershipId, inactiveId, outsiderMembershipId, outsiderOrganizationId, outsiderId]);
    await pool.query(`insert into events
      (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at)
      values ($1, $2, $3, 'F02 schedule event', 'Disposable settings test', 'Singapore', ARRAY['Technology'], ARRAY[]::text[], '2026-11-19', '2026-11-19', 'Asia/Singapore', '2026-11-18T16:00:00Z', '2026-11-19T16:00:00Z')`, [eventId, organizationId, ownerId]);

    const firstSettings = await Promise.all([0, 0].map((expectedRevision) => saveSettings({ eventId, userId: ownerId, expectedRevision, settings })));
    assert.equal(firstSettings.filter((result) => result.kind === "saved").length, 1);
    assert.equal(firstSettings.filter((result) => result.kind === "conflict").length, 1);
    assert.deepEqual((await pool.query("select revision from event_networking_settings where event_id = $1", [eventId])).rows[0], { revision: 1 });
    assert.equal((await getSettings(eventId, organizerId)).revision, 1, "active organizers can read event settings");
    assert.deepEqual((await getSettings(eventId, organizerId)).settings, settings, "saved settings persist when read again");
    assert.equal(await getSettings(eventId, sponsorId), null, "sponsors cannot read event settings");
    assert.equal(await getSettings(eventId, inactiveId), null, "inactive owners cannot read event settings");
    assert.equal(await getSettings(eventId, outsiderId), null, "cross-organization owners cannot read event settings");
    assert.equal((await listWefters(eventId, organizerId)).wefters.length, 0, "organizers can manage Wefters");
    assert.equal(await listWefters(eventId, sponsorId), null, "sponsors cannot read the Wefter roster");
    assert.equal(await listWefters(eventId, outsiderId), null, "cross-organization owners cannot read the Wefter roster");
    assert.equal((await saveSettings({ eventId, userId: sponsorId, expectedRevision: 1, settings })).kind, "denied");
    assert.equal((await saveSettings({ eventId, userId: outsiderId, expectedRevision: 1, settings })).kind, "denied");
    assert.equal((await saveWefter({ eventId, membershipId: staffMembershipId, userId: sponsorId, expectedRevision: 0, assigned: true, availabilityWindows })).kind, "denied");

    assert.equal((await saveWefter({ eventId, membershipId: staffMembershipId, userId: ownerId, expectedRevision: 0, assigned: true, availabilityWindows })).kind, "saved");
    assert.equal((await saveWefter({ eventId, membershipId: staffTwoMembershipId, userId: organizerId, expectedRevision: 0, assigned: true, availabilityWindows })).kind, "saved", "active organizers can assign Wefters and set their hours");
    assert.equal((await saveWefter({ eventId, membershipId: staffThreeMembershipId, userId: ownerId, expectedRevision: 0, assigned: true, availabilityWindows })).kind, "saved");
    assert.equal((await listWefters(eventId, ownerId)).wefters.length, 3, "multiple simultaneous Wefters are supported");
    assert.deepEqual((await getOwnWefterHours(eventId, staffId)).availabilityWindows, availabilityWindows, "Wefters can read their own availability");
    assert.equal(await getOwnWefterHours(eventId, sponsorId), null, "non-Wefters cannot read restricted Wefter hours");
    const changedByF01 = await saveEventAccess({ eventId, membershipId: staffMembershipId, userId: ownerId, expectedRevision: 1, accessMode: "operator" });
    assert.equal(changedByF01.kind, "saved");
    const afterModeChange = (await pool.query("select console_access, revision, availability_windows from event_staff where event_id = $1 and membership_id = $2", [eventId, staffMembershipId])).rows[0];
    assert.deepEqual(afterModeChange, { console_access: "operator", revision: 2, availability_windows: [] });
    assert.equal((await saveWefter({ eventId, membershipId: staffMembershipId, userId: ownerId, expectedRevision: 1, assigned: true, availabilityWindows })).kind, "conflict");
    const outsideSettings = { ...settings, networkingWindows: [{ startsAt: "2026-11-17T17:00:00.000Z", endsAt: "2026-11-17T18:00:00.000Z" }] };
    assert.equal((await saveSettings({ eventId, userId: ownerId, expectedRevision: 1, settings: outsideSettings })).kind, "invalid-time", "networking windows outside the event are rejected");
    assert.equal((await saveWefter({ eventId, membershipId: staffThreeMembershipId, userId: ownerId, expectedRevision: 1, assigned: true, availabilityWindows: outsideSettings.networkingWindows })).kind, "invalid-time", "availability outside the event is rejected");

    assert.equal((await saveEventAccess({ eventId, membershipId: staffMembershipId, userId: ownerId, expectedRevision: 2, accessMode: null })).kind, "saved");
    assert.equal((await saveWefter({ eventId, membershipId: staffMembershipId, userId: ownerId, expectedRevision: 3, assigned: true, availabilityWindows })).kind, "saved");
    const restored = (await pool.query("select console_access, revision, availability_windows from event_staff where event_id = $1 and membership_id = $2", [eventId, staffMembershipId])).rows[0];
    assert.deepEqual(restored, { console_access: "wefter", revision: 4, availability_windows: availabilityWindows });
  } finally {
    await pool.query("delete from events where id = $1", [eventId]);
    await pool.query("delete from organization_memberships where id = any($1::uuid[])", [[ownerMembershipId, staffMembershipId, staffTwoMembershipId, staffThreeMembershipId, organizerMembershipId, sponsorMembershipId, inactiveMembershipId, outsiderMembershipId]]);
    await pool.query("delete from organizations where id = any($1::uuid[])", [[organizationId, outsiderOrganizationId]]);
    await pool.query("delete from users where id = any($1::uuid[])", [[ownerId, staffId, staffTwoId, staffThreeId, organizerId, sponsorId, inactiveId, outsiderId]]);
    await closeDatabase(); await pool.end();
    if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
  }
});
