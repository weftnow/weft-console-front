import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("drizzle/0010_profile_versions.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

test("migration 0010 is journaled after 0009", () => {
  assert.equal(journal.entries[10].tag, "0010_profile_versions");
  assert.equal(journal.entries[9].tag, "0009_networking_inclusion");
});

test("existing guests start without a profile (version 0) and the log gains profile_updated", () => {
  assert.match(sql, /ADD COLUMN "profile_version" integer DEFAULT 0 NOT NULL/);
  assert.match(sql, /"event_guests_profile_version_valid" CHECK \("event_guests"."profile_version" >= 0\)/);
  assert.match(sql, /event_matching_change_kind" ADD VALUE 'profile_updated'/);
});

test("profile versions are unique per guest, bound to the guest's event and limited to the matching keys", () => {
  assert.match(sql, /UNIQUE\("guest_id","version"\)/);
  assert.match(sql, /FOREIGN KEY \("guest_id","event_id"\) REFERENCES "public"."event_guests"\("id","event_id"\) ON DELETE cascade/);
  assert.match(sql, /"organizer_only_fields" <@ ARRAY\['goals','offers','desiredConnections','avoid','background','linkedinDetails','missingDetails'\]/);
  assert.match(sql, /"summary".*between 1 and 500/);
  assert.match(sql, /"goals".*between 1 and 2000/);
});
