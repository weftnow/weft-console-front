import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const enabled = process.env.WEFT_DATABASE_TEST === "1";

// Requires migration 0013 on the target. Isolation rule as for the F03/F07 suites: loopback weft_f08_scratch or the
// direct development Neon weft_console_test with explicit authorization; never production. Fixtures use random IDs and clean up.
test("F08 feed pages are idempotent, ordered, event-scoped and never reactivate a revoked match", { skip: !enabled }, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const url = new URL(process.env.DATABASE_TEST_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localScratch = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && database === "weft_f08_scratch";
  const migrationUrl = process.env.DATABASE_MIGRATION_URL ? new URL(process.env.DATABASE_MIGRATION_URL) : null;
  const configuredNeonDev = url.hostname.endsWith(".neon.tech") && !url.hostname.includes("-pooler.") && database === "weft_console_test" &&
    process.env.WEFT_MIGRATION_TARGET === "development" && migrationUrl?.hostname === url.hostname &&
    !migrationUrl.hostname.includes("-pooler.") && decodeURIComponent(migrationUrl.pathname.slice(1)) === database;
  assert.ok(localScratch || configuredNeonDev, "F08 database tests require loopback weft_f08_scratch or direct development weft_console_test");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  assert.equal((await pool.query("select current_database() as db")).rows[0]?.db, database);
  process.env.DATABASE_URL = url.toString();
  const { applyFeedPage, readCursor, listEventMatches, findEventMatch } = loadTs("src/modules/network/server/match-repository.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const ownerId = randomUUID(), orgId = randomUUID(), eventId = randomUUID(), otherEventId = randomUUID(), runId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID()].sort();
  const [a, b, c] = ids;
  const personIds = ids.map(() => randomUUID());
  const rec = (low, high, overrides = {}) => ({
    recommendationId: randomUUID(), guestLowId: low, guestHighId: high,
    profileVersions: { [low]: 0, [high]: 0 }, directionalScores: { [low]: 80, [high]: 70 }, pairScore: 75,
    benefits: { [low]: "Useful to one.", [high]: "Useful to two." }, evidence: [], missingInformation: { [low]: [], [high]: [] },
    uncertainty: "", shareableReasons: { [low]: null, [high]: null }, revokedAt: null, revocationReason: null, ...overrides,
  });
  const page = (entries, nextCursor) => ({ entries, nextCursor });
  const matchRows = async () => (await pool.query("select status, revocation_reason, guest_low_id, guest_high_id, introduction_path from event_matches where event_id = $1 order by created_at, id", [eventId])).rows;
  try {
    await pool.query("insert into users (id, display_name) values ($1,'F08 owner')", [ownerId]);
    await pool.query("insert into organizations (id, name) values ($1,'F08 organization')", [orgId]);
    for (const id of [eventId, otherEventId]) {
      await pool.query("insert into events (id, organization_id, creator_id, name, description, city, categories, expected_audience, start_date, end_date, timezone, starts_at, ends_at) values ($1,$2,$3,'F08 event','Disposable F08 fixture','Singapore',ARRAY['Technology'],ARRAY[]::text[],'2026-11-19','2026-11-19','Asia/Singapore','2026-11-18T16:00:00Z','2026-11-19T16:00:00Z')", [id, orgId, ownerId]);
    }
    for (const [index, id] of ids.entries()) {
      await pool.query("insert into event_people (id, event_id) values ($1,$2)", [personIds[index], eventId]);
      await pool.query("insert into event_guests (id, event_id, position, first_name, last_name, email, phone, company, job_position, profile_type, linkedin, guest_type, source, person_id) values ($1,$2,$3,'G','Guest','','', 'Acme','Dev','','', $4,'manual',$5)", [id, eventId, index, index === 2 ? "VIP" : "Attendee", personIds[index]]);
    }

    const issued = rec(a, b);
    const first = page([{ seq: 1, kind: "issued", runId, recommendation: issued }], 1);
    assert.deepEqual(await applyFeedPage(eventId, 0, first), { applied: true, created: 1, revoked: 0, skipped: 0 });
    assert.equal((await readCursor(eventId)).lastSeq, 1);
    assert.deepEqual(await applyFeedPage(eventId, 0, first), { applied: false }, "a stale cursor applies nothing");
    assert.deepEqual(await applyFeedPage(eventId, 1, first), { applied: true, created: 0, revoked: 0, skipped: 0 }, "a replayed entry creates nothing");
    let rows = await matchRows();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].introduction_path, "sms_coordination");

    // Revocation, then a replayed issued entry must not reactivate it.
    const revocation = page([{ seq: 2, kind: "revoked", runId: null, recommendation: { ...issued, revokedAt: "2026-10-19T12:00:00Z", revocationReason: "guest_excluded" } }], 2);
    assert.equal((await applyFeedPage(eventId, 1, revocation)).revoked, 1);
    await applyFeedPage(eventId, 2, page([{ seq: 1, kind: "issued", runId, recommendation: issued }], 2));
    rows = await matchRows();
    assert.equal(rows[0].status, "revoked");
    assert.equal(rows[0].revocation_reason, "guest_excluded");

    // A VIP pair uses a Wefter; an excluded guest stores the pair revoked instead of dropping it.
    await pool.query("update event_guests set networking_status = 'excluded', networking_excluded_at = now(), networking_excluded_by = $2, networking_exclusion_reason = 'other' where id = $1", [b, ownerId]);
    await applyFeedPage(eventId, 2, page([
      { seq: 3, kind: "issued", runId, recommendation: rec(b, c) },
    ], 3));
    rows = await matchRows();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].status, "revoked");
    assert.equal(rows[1].revocation_reason, "guest_excluded");
    assert.equal(rows[1].introduction_path, "wefter");

    // The same pair under a different recommendation id never creates a second row.
    await applyFeedPage(eventId, 3, page([{ seq: 4, kind: "issued", runId, recommendation: rec(a, b) }], 4));
    assert.equal((await matchRows()).length, 2);

    // Unknown guests are skipped; the database rejects unordered and cross-event pairs directly.
    const skipped = await applyFeedPage(eventId, 4, page([{ seq: 5, kind: "issued", runId, recommendation: rec(a, randomUUID().replace(/^./, "f")) }], 5));
    assert.equal(skipped.skipped, 1);
    await assert.rejects(() => pool.query("insert into event_matches (event_id, guest_low_id, guest_high_id, engine_recommendation_id, profile_version_low, profile_version_high, score_low, score_high, pair_score, benefits, shareable_reasons, missing_information, evidence, uncertainty, introduction_path) values ($1,$3,$2,$4,0,0,1,1,1,'{}','{}','{}','[]','','wefter')", [eventId, a, b, randomUUID()]), /event_matches_order_valid/);
    await assert.rejects(() => pool.query("insert into event_matches (event_id, guest_low_id, guest_high_id, engine_recommendation_id, profile_version_low, profile_version_high, score_low, score_high, pair_score, benefits, shareable_reasons, missing_information, evidence, uncertainty, introduction_path) values ($1,$2,$3,$4,0,0,1,1,1,'{}','{}','{}','[]','','wefter')", [otherEventId, a, c, randomUUID()]), /event_matches_(low|high)_guest_fk/);

    // Reads are event-scoped.
    assert.equal((await listEventMatches(eventId)).rows.length, 2);
    assert.equal((await listEventMatches(otherEventId)).rows.length, 0);
    const [{ id: matchId }] = (await pool.query("select id from event_matches where event_id = $1 limit 1", [eventId])).rows;
    assert.equal(await findEventMatch(otherEventId, matchId), null);
    assert.ok(await findEventMatch(eventId, matchId));

    // Concurrent identical pages leave one row per pair.
    const racing = rec(a, c);
    await Promise.all([0, 1, 2].map(() => applyFeedPage(eventId, 5, page([{ seq: 6, kind: "issued", runId, recommendation: racing }], 6))));
    assert.equal((await matchRows()).filter((r) => r.guest_low_id === a && r.guest_high_id === c).length, 1);
  } finally {
    await pool.query("delete from event_match_feed_cursors where event_id in ($1,$2)", [eventId, otherEventId]);
    await pool.query("delete from event_matches where event_id in ($1,$2)", [eventId, otherEventId]);
    await pool.query("delete from event_guests where event_id in ($1,$2)", [eventId, otherEventId]);
    await pool.query("delete from event_people where event_id in ($1,$2)", [eventId, otherEventId]);
    await pool.query("delete from events where id in ($1,$2)", [eventId, otherEventId]);
    await pool.query("delete from organizations where id = $1", [orgId]);
    await pool.query("delete from users where id = $1", [ownerId]);
    await closeDatabase();
    await pool.end();
  }
});
