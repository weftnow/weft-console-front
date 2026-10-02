import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actorId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const data = { fileName: "batch.csv", csvText: "First Name,Email,Guest Type\nAda,ada@example.com,VIP\nGrace,grace@example.com,Attendee\n" };
const dto = (overrides = {}) => ({
  id: "44444444-4444-4444-8444-444444444444", eventId, fileName: "batch.csv",
  importedCount: 2, storedCount: 1, duplicateCount: 1, blankCount: 0,
  vipCount: 0, sponsorCount: 0, importedAt: "2026-10-02T00:00:00.000Z", ...overrides,
});

function dependencies({ snapshot, onWrite = () => {}, onLock, authorize = async () => {} }) {
  const calls = { find: 0, authorize: 0, lock: 0 };
  return {
    calls,
    value: {
      findOrganizationId: async () => { calls.find++; return organizationId; },
      requireCreator: async (input) => { calls.authorize++; assert.deepEqual(input, { userId: actorId, organizationId }); return authorize(); },
      withLockedEventRoster: async (args, decide) => {
        calls.lock++;
        const decision = decide(snapshot);
        if (onLock) return onLock({ args, decision });
        if (decision.kind === "replay") return { import: decision.import, replayed: true };
        onWrite(decision);
        return { import: dto({
          importedCount: decision.counts.importedCount,
          storedCount: decision.counts.storedCount,
          duplicateCount: decision.counts.duplicateCount,
          blankCount: decision.counts.blankCount,
          vipCount: decision.counts.vipCount,
          sponsorCount: decision.counts.sponsorCount,
        }), replayed: false };
      },
    },
    calls,
  };
}

const snapshot = (overrides = {}) => ({
  membership: { active: true, role: "organizer" },
  event: { id: eventId, organizationId }, existingCount: 1, maxPosition: 4,
  existingEmails: new Set(["ada@example.com"]), matchingImport: null, ...overrides,
});

test("import service authorizes before parsing malformed CSV and performs no writes", async () => {
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  let writes = 0;
  const deps = dependencies({ snapshot: snapshot(), onWrite: () => writes++ });
  await assert.rejects(importAttendees({ userId: actorId, eventId, data: { fileName: "batch.csv", csvText: "not a csv" } }, deps.value), (error) => error.code === "VALIDATION_ERROR");
  assert.equal(deps.calls.authorize, 1);
  assert.equal(deps.calls.lock, 0);
  assert.equal(writes, 0);
});

test("missing event and revoked membership cannot disclose or replay import history", async () => {
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const missing = dependencies({ snapshot: snapshot(), onLock: () => { throw new Error("must not lock"); } });
  missing.value.findOrganizationId = async () => null;
  await assert.rejects(importAttendees({ userId: actorId, eventId, data }, missing.value), (error) => error.code === "NOT_FOUND");
  const denied = dependencies({ snapshot: snapshot({ matchingImport: dto() }), authorize: async () => { throw Object.assign(new Error("denied"), { code: "FORBIDDEN" }); } });
  await assert.rejects(importAttendees({ userId: actorId, eventId, data }, denied.value), (error) => error.code === "FORBIDDEN");
  assert.equal(denied.calls.lock, 0);
});

test("authorized import appends new guests after current max position and skips existing event emails", async () => {
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  let decision;
  const deps = dependencies({ snapshot: snapshot(), onWrite: (value) => { decision = value; } });
  const result = await importAttendees({ userId: actorId, eventId, data }, deps.value);
  assert.deepEqual(result, { import: dto({ storedCount: 1, duplicateCount: 1, vipCount: 0 }), replayed: false });
  assert.equal(decision.kind, "append");
  assert.equal(decision.firstPosition, 5);
  assert.deepEqual(decision.guests.map((guest) => guest.firstName), ["Grace"]);
  assert.equal(decision.counts.duplicateCount, 1);
});

test("content replay returns original batch before capacity checks and without writes", async () => {
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const original = dto({ storedCount: 2, duplicateCount: 0 });
  let writes = 0;
  const deps = dependencies({ snapshot: snapshot({ existingCount: 2000, matchingImport: original }), onWrite: () => writes++ });
  const result = await importAttendees({ userId: actorId, eventId, data }, deps.value);
  assert.deepEqual(result, { import: original, replayed: true });
  assert.equal(writes, 0);
});

test("event-local append capacity rejects atomically with proposed-addition feedback", async () => {
  const { importAttendees } = loadTs("src/modules/events/server/attendee-import-service.ts");
  let writes = 0;
  const deps = dependencies({ snapshot: snapshot({ existingCount: 2000, existingEmails: new Set() }), onWrite: () => writes++ });
  await assert.rejects(importAttendees({ userId: actorId, eventId, data }, deps.value), (error) => error.code === "VALIDATION_ERROR" && /spaces remain.*would add 2/.test(error.fields?.csvText ?? ""));
  assert.equal(writes, 0);
});
