import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const eventId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";
const saved = { eventId, organizationId: "33333333-3333-4333-8333-333333333333", membershipId, accessMode: "operator", revision: 3, memberName: "Ada Staff", role: "staff" };

test("stale event access edits return a typed authorized snapshot and never retry automatically", async () => {
  const { updateEventAccess } = loadTs("src/modules/events/server/access-service.ts");
  const calls = [];
  const deps = {
    saveEventAccess: async (input) => { calls.push(input); return { kind: "conflict", current: saved }; },
    listEventAccess: async () => [saved],
  };
  await assert.rejects(updateEventAccess({ eventId, membershipId, userId: "actor", data: { accessMode: "wefter", expectedRevision: 2 } }, deps), (error) => {
    assert.equal(error.code, "CONFLICT");
    assert.equal(error.details.kind, "STALE_VERSION");
    assert.equal(error.details.current.revision, 3);
    assert.equal(error.details.current.accessMode, "operator");
    return true;
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].expectedRevision, 2);
});

test("event access rejects malformed revisions and refuses to return snapshots after actor revocation", async () => {
  const { updateEventAccess } = loadTs("src/modules/events/server/access-service.ts");
  let writes = 0;
  const deps = { saveEventAccess: async () => { writes++; return { kind: "denied" }; }, listEventAccess: async () => null };
  await assert.rejects(updateEventAccess({ eventId, membershipId, userId: "actor", data: { accessMode: "operator", expectedRevision: -1 } }, deps), (error) => error.code === "VALIDATION_ERROR");
  await assert.rejects(updateEventAccess({ eventId, membershipId, userId: "actor", data: { accessMode: "operator", expectedRevision: 1 } }, deps), (error) => error.code === "FORBIDDEN");
  assert.equal(writes, 1);
});
