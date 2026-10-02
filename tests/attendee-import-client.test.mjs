import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const eventId = "22222222-2222-4222-8222-222222222222";
const input = { fileName: "guests.csv", csvText: "First Name\nAda\n" };
const result = {
  import: {
    id: "33333333-3333-4333-8333-333333333333", eventId, fileName: "guests.csv",
    importedCount: 3, storedCount: 2, duplicateCount: 1, blankCount: 0,
    vipCount: 1, sponsorCount: 0, importedAt: "2026-10-02T00:00:00.000Z",
  }, replayed: false,
};

test("attendee import client validates the response and submits once to the event endpoint", async () => {
  const { submitAttendeeImport } = loadTs("src/modules/events/mutations/import-attendees.ts");
  let calls = 0;
  const value = await submitAttendeeImport(eventId, input, async (url, options) => {
    calls++;
    assert.equal(url, `/api/events/${eventId}/attendee-imports`);
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "same-origin");
    return Response.json({ data: result }, { status: 201 });
  });
  assert.deepEqual(value, result);
  assert.equal(calls, 1);
});

test("attendee import client handles replay, structured errors, malformed responses and network failure", async () => {
  const { submitAttendeeImport } = loadTs("src/modules/events/mutations/import-attendees.ts");
  const replay = { ...result, replayed: true };
  assert.deepEqual(await submitAttendeeImport(eventId, input, async () => Response.json({ data: replay }, { status: 200 })), replay);
  await assert.rejects(submitAttendeeImport(eventId, input, async () => Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the CSV.", fields: { "rows.2.email": "Invalid email." } } }, { status: 422 })), (error) => error.code === "VALIDATION_ERROR" && error.fields["rows.2.email"] === "Invalid email.");
  await assert.rejects(submitAttendeeImport(eventId, input, async () => Response.json({ data: { import: { id: "forged" }, replayed: false } }, { status: 201 })), (error) => error.code === "INTERNAL_ERROR");
  let calls = 0;
  await assert.rejects(submitAttendeeImport(eventId, input, async () => { calls++; throw new Error("network secret"); }), (error) => error.code === "INTERNAL_ERROR" && !error.message.includes("secret"));
  assert.equal(calls, 1);
});

test("synchronous submit guard blocks duplicate clicks until the first operation settles", async () => {
  const { submitImportOnce } = loadTs("src/modules/events/mutations/import-attendees.ts");
  const guard = { current: false };
  let calls = 0;
  let release;
  const pending = submitImportOnce(guard, () => new Promise((resolve) => { calls++; release = resolve; }));
  const duplicate = await submitImportOnce(guard, async () => { calls++; });
  assert.equal(duplicate, false);
  assert.equal(calls, 1);
  release();
  assert.equal(await pending, true);
  assert.equal(guard.current, false);
});

test("post-save refresh failure is reported as a saved import", async () => {
  const { refreshAfterImport } = loadTs("src/modules/events/mutations/import-attendees.ts");
  assert.equal(await refreshAfterImport(async () => { throw new Error("router failure"); }), "Import saved; refresh to load the updated roster.");
  assert.equal(await refreshAfterImport(async () => {}), null);
});

test("success feedback distinguishes replay and warns when filters can hide new attendees", () => {
  const { importSuccessMessage } = loadTs("src/modules/events/mutations/import-attendees.ts");
  assert.match(importSuccessMessage(result, true), /2 added, 1 already on this event and skipped.*hidden/);
  assert.equal(importSuccessMessage({ ...result, replayed: true }, true), "This file was already imported; no attendees were added again.");
});

test("shared attendee template retains the Create Event columns", () => {
  const { GUEST_CSV_TEMPLATE } = loadTs("src/modules/events/guest-csv-template.ts");
  assert.equal(GUEST_CSV_TEMPLATE.split("\n")[0], "First Name,Last Name,Email,Phone,Company,Position,LinkedIn,Profile Type,Guest Type");
});
