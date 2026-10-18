import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";

test("event access grants serialize first saves and retain incremented revocation tombstones", { skip: !enabled }, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const url = new URL(process.env.DATABASE_TEST_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localScratch = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && database === "weft_f01_scratch";
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ? new URL(process.env.DATABASE_MIGRATION_URL) : null;
  const configuredNeonDev = url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.") &&
    database === "weft_console_test" && process.env.WEFT_MIGRATION_TARGET === "development" &&
    migrationUrl?.hostname === url.hostname && decodeURIComponent(migrationUrl.pathname.slice(1)) === database;
  assert.ok(localScratch || configuredNeonDev,
    "F01 database tests require weft_f01_scratch on loopback or the direct configured development Neon test database");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url.toString(), max: 3 });
  const dbName = await pool.query("select current_database() as db");
  assert.equal(dbName.rows[0]?.db, database);

  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url.toString();
  const ownerId = randomUUID();
  const staffId = randomUUID();
  const organizationId = randomUUID();
  const ownerMembershipId = randomUUID();
  const staffMembershipId = randomUUID();
  const eventId = randomUUID();
  const { saveEventAccess, findEventAccessForActor } = loadTs("src/modules/events/server/access-repository.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  try {
    await pool.query("insert into users (id, display_name) values ($1, 'F01 owner'), ($2, 'F01 staff')", [ownerId, staffId]);
    await pool.query("insert into organizations (id, name) values ($1, 'F01 scratch organization')", [organizationId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'owner', true), ($4, $2, $5, 'staff', true)", [ownerMembershipId, organizationId, ownerId, staffMembershipId, staffId]);
    await pool.query(`insert into events
      (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at)
      values ($1, $2, $3, 'F01 access event', 'Disposable access test', 'Singapore', ARRAY['Technology'], ARRAY[]::text[], '2026-11-19', '2026-11-19', 'Asia/Singapore', '2026-11-18T16:00:00Z', '2026-11-19T16:00:00Z')`, [eventId, organizationId, ownerId]);

    const save = (accessMode, expectedRevision) => saveEventAccess({ eventId, userId: ownerId, membershipId: staffMembershipId, accessMode, expectedRevision });
    const results = await Promise.all([save("operator", 0), save("wefter", 0)]);
    assert.equal(results.filter((result) => result.kind === "saved").length, 1);
    assert.equal(results.filter((result) => result.kind === "conflict").length, 1);
    const granted = await pool.query("select console_access, revision from event_staff where event_id = $1 and membership_id = $2", [eventId, staffMembershipId]);
    assert.equal(granted.rows[0].revision, 1);
    assert.ok(["operator", "wefter"].includes(granted.rows[0].console_access));

    assert.equal((await save(null, 1)).kind, "saved");
    assert.equal((await save("operator", 2)).kind, "saved");
    const tombstone = await pool.query("select console_access, revision from event_staff where event_id = $1 and membership_id = $2", [eventId, staffMembershipId]);
    assert.deepEqual(tombstone.rows[0], { console_access: "operator", revision: 3 });
    assert.equal((await save(null, 3)).kind, "saved");
    const afterRevoke = await pool.query("select console_access, revision from event_staff where event_id = $1 and membership_id = $2", [eventId, staffMembershipId]);
    assert.deepEqual(afterRevoke.rows[0], { console_access: null, revision: 4 });
    assert.equal(await findEventAccessForActor(eventId, staffId), null);
    const revoker = await pool.connect();
    let committed = false;
    try {
      await revoker.query("begin");
      await revoker.query("select id from organization_memberships where id = $1 for update", [ownerMembershipId]);
      const racingSave = save("wefter", 4);
      await revoker.query("update organization_memberships set active = false where id = $1", [ownerMembershipId]);
      await revoker.query("commit");
      committed = true;
      assert.equal((await racingSave).kind, "denied");
    } finally {
      if (!committed) await revoker.query("rollback");
      revoker.release();
    }
  } finally {
    await pool.query("delete from events where id = $1", [eventId]);
    await pool.query("delete from organization_memberships where id = any($1::uuid[])", [[ownerMembershipId, staffMembershipId]]);
    await pool.query("delete from organizations where id = $1", [organizationId]);
    await pool.query("delete from users where id = any($1::uuid[])", [[ownerId, staffId]]);
    await closeDatabase();
    await pool.end();
    if (previousUrl) process.env.DATABASE_URL = previousUrl; else delete process.env.DATABASE_URL;
  }
});
