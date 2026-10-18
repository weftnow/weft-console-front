import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("drizzle/0005_networking_inclusion.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

test("migration 0005 is journaled after the existing migrations", () => {
  assert.equal(journal.entries[5].tag, "0005_networking_inclusion");
  assert.equal(journal.entries[4].tag, "0004_gigantic_taskmaster");
});

test("existing guests default to included at version 1", () => {
  assert.match(sql, /"networking_status" "event_guest_networking_status" DEFAULT 'included' NOT NULL/);
  assert.match(sql, /"networking_version" integer DEFAULT 1 NOT NULL/);
});

test("guest uniqueness on (id, event_id) exists before composite foreign keys use it", () => {
  const unique = sql.indexOf('"event_guests_id_event_unique" UNIQUE("id","event_id")');
  const firstForeignKey = sql.indexOf("REFERENCES \"public\".\"event_guests\"(\"id\",\"event_id\")");
  assert.ok(unique > -1 && firstForeignKey > -1);
  assert.ok(unique < firstForeignKey);
});

test("the schema keeps exclusion fields coherent, pairs canonical and the log bounded", () => {
  assert.match(sql, /event_guests_networking_valid/);
  assert.match(sql, /"guest_low_id" < "event_guest_match_blocks"."guest_high_id"/);
  assert.match(sql, /"event_guest_match_blocks_pair_unique" UNIQUE\("event_id","guest_low_id","guest_high_id"\)/);
  assert.match(sql, /cardinality\("event_matching_changes"."guest_ids"\) between 1 and 2/);
});
