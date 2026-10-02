import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath = "drizzle/0001_attendee_import_batches.sql";

test("attendee batch migration preserves the original migration and guards legacy data", () => {
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  assert.equal(journal.entries[0].tag, "0000_create_event_backend");
  assert.equal(journal.entries[1].tag, "0001_attendee_import_batches");
  const migration = readFileSync(migrationPath, "utf8");
  for (const fragment of [
    "event_guests", "event_attendee_imports", "creator_id", "created_at", "updated_at",
    "position", "normalized_email", "RAISE EXCEPTION", "import_id", "content_hash",
  ]) assert.ok(migration.includes(fragment), `migration must handle ${fragment}`);
  assert.match(migration, /event_attendee_imports.*id/i);
  assert.match(migration, /event_guests.*import_id/i);
});

test("migration generation keeps the named task command configurable", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  assert.match(packageJson.scripts["db:generate"], /drizzle-kit generate/);
  assert.doesNotMatch(packageJson.scripts["db:generate"], /create_event_backend/);
});
