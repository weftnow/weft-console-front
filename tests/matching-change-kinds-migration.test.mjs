import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("drizzle/0012_f07_matching_change_kinds.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

test("migration 0012 is journaled after the reconciliation migration", () => {
  assert.equal(journal.entries[12].tag, "0012_f07_matching_change_kinds");
  assert.equal(journal.entries[11].tag, "0011_reconcile_console_history");
});

test("the three new change kinds are added to the existing enum", () => {
  for (const kind of ["attendees_imported", "attendee_corrected", "identity_linked"]) {
    assert.match(sql, new RegExp(`ALTER TYPE "public"\\."event_matching_change_kind" ADD VALUE '${kind}'`));
  }
  assert.doesNotMatch(sql, /DROP TYPE|DROP COLUMN|DELETE FROM|UPDATE "/i, "the migration changes no existing data");
});

test("event-level kinds carry no guests and other kinds keep one or two", () => {
  assert.match(sql, /DROP CONSTRAINT "event_matching_changes_guests_valid"/);
  assert.match(sql, /"kind"::text in \('attendees_imported', 'identity_linked'\) and cardinality\("event_matching_changes"\."guest_ids"\) = 0/);
  assert.match(sql, /"kind"::text not in \('attendees_imported', 'identity_linked'\) and cardinality\("event_matching_changes"\."guest_ids"\) between 1 and 2/);
});

test("the check compares text so it never uses an enum value added in the same transaction", () => {
  const check = sql.slice(sql.indexOf("ADD CONSTRAINT"));
  assert.doesNotMatch(check, /"kind" (=|in|not in) \('?(attendees_imported|attendee_corrected|identity_linked)/);
  assert.doesNotMatch(check, /'(attendees_imported|identity_linked)'::"?event_matching_change_kind/);
});
