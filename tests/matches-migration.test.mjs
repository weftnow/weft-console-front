import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("drizzle/0013_f08_event_matches.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

test("migration 0013 follows the F07 change kinds migration", () => {
  assert.equal(journal.entries[13].tag, "0013_f08_event_matches");
  assert.equal(journal.entries[12].tag, "0012_f07_matching_change_kinds");
});

test("the migration only adds objects and changes no existing data", () => {
  assert.doesNotMatch(sql, /DROP |DELETE FROM|UPDATE "|TRUNCATE|ALTER TABLE "(?!event_match)/i);
});

test("a pair is one ordered, event-scoped row per event", () => {
  assert.match(sql, /"event_matches_order_valid" CHECK \("event_matches"\."guest_low_id" < "event_matches"\."guest_high_id"\)/);
  assert.match(sql, /"event_matches_pair_unique" UNIQUE\("event_id","guest_low_id","guest_high_id"\)/);
  assert.match(sql, /"event_matches_recommendation_unique" UNIQUE\("event_id","engine_recommendation_id"\)/);
  assert.match(sql, /"event_matches_low_guest_fk" FOREIGN KEY \("guest_low_id","event_id"\) REFERENCES "public"\."event_guests"\("id","event_id"\)/);
  assert.match(sql, /"event_matches_high_guest_fk" FOREIGN KEY \("guest_high_id","event_id"\) REFERENCES "public"\."event_guests"\("id","event_id"\)/);
});

test("a match is active or revoked with a reason, and has no acceptance states", () => {
  assert.match(sql, /"event_match_status" AS ENUM\('active', 'revoked'\)/);
  assert.match(sql, /"event_match_revocation_reason" AS ENUM\('guest_excluded', 'pair_blocked', 'identity_resolution_required', 'guest_missing'\)/);
  assert.match(sql, /"event_match_introduction_path" AS ENUM\('sms_coordination', 'wefter'\)/);
  assert.doesNotMatch(sql, /accept|declin|meeting/i);
  assert.match(sql, /"event_matches_revocation_valid" CHECK/);
});

test("each event has one non-negative feed cursor", () => {
  assert.match(sql, /"event_id" uuid PRIMARY KEY NOT NULL,\s+"last_seq" integer DEFAULT 0 NOT NULL/);
  assert.match(sql, /"event_match_feed_cursors_seq_valid" CHECK \("event_match_feed_cursors"\."last_seq" >= 0\)/);
});
