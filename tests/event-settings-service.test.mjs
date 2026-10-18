import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { readSettings, updateSettings, readWefters, updateWefter } = loadTs("src/modules/events/server/settings-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");
const actor = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const empty = { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };
const settingsDto = { eventId, revision: 1, settings: empty, missing: Object.keys(empty), updatedAt: "2026-10-18T00:00:00.000Z", timezone: "Asia/Singapore" };
const assignment = { expectedRevision: 0, assigned: true, availabilityWindows: [] };

test("settings reads and writes fail closed for denied organizations and malformed input", async () => {
  const denied = { getSettings: async () => null, saveSettings: async () => ({ kind: "denied" }) };
  await assert.rejects(readSettings(eventId, actor, denied), (error) => error instanceof ApplicationError && error.code === "FORBIDDEN");
  await assert.rejects(updateSettings(eventId, actor, { expectedRevision: 0, settings: { ...empty, injected: true } }, denied), (error) => error instanceof ApplicationError && error.code === "VALIDATION_ERROR");
  await assert.rejects(updateSettings(eventId, actor, { expectedRevision: 0, settings: empty }, denied), (error) => error instanceof ApplicationError && error.code === "FORBIDDEN");
});

test("settings conflicts return only the latest authorized snapshot for deliberate review", async () => {
  let calls = 0;
  const deps = { getSettings: async () => { calls++; return settingsDto; }, saveSettings: async () => ({ kind: "conflict" }) };
  await assert.rejects(updateSettings(eventId, actor, { expectedRevision: 0, settings: empty }, deps), (error) => {
    assert.equal(error.code, "CONFLICT");
    assert.equal(error.details.kind, "STALE_VERSION");
    assert.deepEqual(error.details.current, settingsDto);
    return true;
  });
  assert.equal(calls, 1);
});

test("Wefter administration denies unauthorized actors and preserves current data on conflict", async () => {
  const denied = { listWefters: async () => null, saveWefter: async () => ({ kind: "denied" }) };
  await assert.rejects(readWefters(eventId, actor, denied), (error) => error instanceof ApplicationError && error.code === "FORBIDDEN");
  await assert.rejects(updateWefter(eventId, memberId, actor, assignment, denied), (error) => error instanceof ApplicationError && error.code === "FORBIDDEN");
  const current = { eventId, organizationId: eventId, membershipId: memberId, memberName: "Wefter", role: "staff", accessMode: "wefter", revision: 2, availabilityWindows: [], updatedAt: null };
  const deps = { listWefters: async () => ({ wefters: [current], candidates: [], timezone: "Asia/Singapore" }), saveWefter: async () => ({ kind: "conflict" }) };
  await assert.rejects(updateWefter(eventId, memberId, actor, assignment, deps), (error) => {
    assert.equal(error.code, "CONFLICT");
    assert.deepEqual(error.details.current, current);
    return true;
  });
});

test("Wefter writes reject malformed input before repository calls", async () => {
  let writes = 0;
  const deps = { listWefters: async () => null, saveWefter: async () => { writes++; return { kind: "saved" }; } };
  await assert.rejects(updateWefter(eventId, memberId, actor, { ...assignment, selfToggle: true }, deps), (error) => error.code === "VALIDATION_ERROR");
  assert.equal(writes, 0);
});
