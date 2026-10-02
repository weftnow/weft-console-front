import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const eventId = "22222222-2222-4222-8222-222222222222";
const batch = {
  id: "33333333-3333-4333-8333-333333333333", eventId, fileName: "guests.csv",
  importedCount: 1, storedCount: 1, duplicateCount: 0, blankCount: 0,
  vipCount: 1, sponsorCount: 0, importedAt: "2026-10-02T00:00:00.000Z",
};
const { handleImportAttendees } = loadTs("src/infrastructure/http/import-attendees-handler.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

function request(body = "{}", headers = {}) {
  return new Request(`https://weft.example/api/events/${eventId}/attendee-imports`, {
    method: "POST", body, headers: { origin: "https://weft.example", "content-type": "application/json", ...headers },
  });
}

function dependencies(importAttendees = async () => ({ import: batch, replayed: false })) {
  return { getCurrentUser: async () => actor, importAttendees };
}

test("anonymous imports return 401 without parsing the body or calling the service", async () => {
  let reads = 0;
  const req = request("{}");
  const originalJson = req.json.bind(req);
  req.json = async () => { reads++; return originalJson(); };
  const response = await handleImportAttendees(req, eventId, {
    getCurrentUser: async () => null, importAttendees: async () => { throw new Error("must not run"); },
  });
  assert.equal(response.status, 401);
  assert.equal(reads, 0);
});

test("import route validates same origin, JSON media type, body size, body and event UUID", async () => {
  const deps = dependencies(async () => ({ import: batch, replayed: false }));
  assert.equal((await handleImportAttendees(request("{}", { origin: "https://other.example" }), eventId, deps)).status, 403);
  assert.equal((await handleImportAttendees(request("{}", { "content-type": "text/plain" }), eventId, deps)).status, 415);
  assert.equal((await handleImportAttendees(request("{"), eventId, deps)).status, 400);
  assert.equal((await handleImportAttendees(request("{}"), "bad-id", deps)).status, 400);
  const tooLarge = await handleImportAttendees(request("x".repeat(3 * 1024 * 1024 + 1)), eventId, deps);
  assert.equal(tooLarge.status, 413);
});

test("strict request schema rejects actor and organization fields", async () => {
  let calls = 0;
  const response = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n", userId: actor.id, organizationId: "spoof" })), eventId, dependencies(async () => { calls++; return { import: batch, replayed: false }; }));
  assert.equal(response.status, 422);
  assert.equal(calls, 0);
});

test("new imports return 201 and replay returns 200 with private no-store headers", async () => {
  const created = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n" })), eventId, dependencies());
  assert.equal(created.status, 201);
  assert.equal(created.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await created.json()).data, { import: batch, replayed: false });
  const replayed = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n" })), eventId, dependencies(async () => ({ import: batch, replayed: true })));
  assert.equal(replayed.status, 200);
  assert.deepEqual((await replayed.json()).data, { import: batch, replayed: true });
});

test("row validation errors are preserved without raw CSV and cross-organization replay is denied", async () => {
  const invalid = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name,Email\nAda,secret-value\n" })), eventId, dependencies(async () => {
    throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", { "rows.2.email": "Enter a valid email address." });
  }));
  assert.equal(invalid.status, 422);
  const error = (await invalid.json()).error;
  assert.equal(error.fields["rows.2.email"], "Enter a valid email address.");
  assert.doesNotMatch(JSON.stringify(error), /secret-value/);
  const denied = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n" })), eventId, dependencies(async () => {
    throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization.");
  }));
  assert.equal(denied.status, 403);
  const missing = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n" })), eventId, dependencies(async () => {
    throw new ApplicationError("NOT_FOUND", "Event not found.");
  }));
  assert.equal(missing.status, 404);
});

test("unexpected import failures use generic copy and safe request logging", async () => {
  const previous = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  try {
    const response = await handleImportAttendees(request(JSON.stringify({ fileName: "guests.csv", csvText: "First Name\nAda\n" })), eventId, dependencies(async () => { throw new Error("SQL secret"); }));
    assert.equal(response.status, 500);
    assert.equal((await response.json()).error.message, "Something went wrong while importing attendees. Please try again.");
    assert.doesNotMatch(JSON.stringify(logs), /SQL secret|Ada/);
    assert.equal(logs.length, 1);
  } finally { console.error = previous; }
});
