import assert from "node:assert/strict";
import test from "node:test";
import { loadTs, stubTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111" };
const eventId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");
let currentActor = actor;
let calls = [];
const settings = { eventId, revision: 1, settings: { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null }, missing: ["networkingWindows"], updatedAt: null, timezone: "Asia/Singapore" };
stubTs("@/infrastructure/auth/current-user.ts", { getCurrentUser: async () => currentActor });
stubTs("@/modules/events/server/settings-service.ts", {
  readSettings: async (...args) => { calls.push(["readSettings", ...args]); if (currentActor?.id !== actor.id) throw new ApplicationError("FORBIDDEN", "Denied"); return settings; },
  updateSettings: async (...args) => { calls.push(["updateSettings", ...args]); if (currentActor?.id !== actor.id) throw new ApplicationError("FORBIDDEN", "Denied"); return settings; },
  readWefters: async (...args) => { calls.push(["readWefters", ...args]); if (currentActor?.id !== actor.id) throw new ApplicationError("FORBIDDEN", "Denied"); return { wefters: [], candidates: [], timezone: "Asia/Singapore" }; },
  updateWefter: async (...args) => { calls.push(["updateWefter", ...args]); if (currentActor?.id !== actor.id) throw new ApplicationError("FORBIDDEN", "Denied"); return null; },
});
const settingsRoute = loadTs("src/app/api/events/[eventId]/settings/route.ts");
const weftersRoute = loadTs("src/app/api/events/[eventId]/wefters/route.ts");
const wefterRoute = loadTs("src/app/api/events/[eventId]/wefters/[membershipId]/route.ts");
const context = { params: Promise.resolve({ eventId }) };
const jsonRequest = (url, body, origin = new URL(url).origin) => new Request(url, { method: "PUT", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

test("settings and Wefter GET APIs authenticate, validate IDs, and use private no-store responses", async () => {
  currentActor = null;
  assert.equal((await settingsRoute.GET(new Request("https://weft.example"), context)).status, 401);
  assert.equal((await weftersRoute.GET(new Request("https://weft.example"), context)).status, 401);
  currentActor = actor;
  assert.equal((await settingsRoute.GET(new Request("https://weft.example"), { params: Promise.resolve({ eventId: "bad" }) })).status, 404);
  const response = await settingsRoute.GET(new Request("https://weft.example"), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).data.settings, settings);
  assert.equal((await weftersRoute.GET(new Request("https://weft.example"), context)).headers.get("cache-control"), "private, no-store");
});

test("mutation APIs reject anonymous and cross-origin requests before calling services", async () => {
  calls = [];
  const url = `https://weft.example/api/events/${eventId}/settings`;
  currentActor = null;
  assert.equal((await settingsRoute.PUT(jsonRequest(url, {}), context)).status, 401);
  assert.equal((await wefterRoute.PUT(jsonRequest(url, {}), { params: Promise.resolve({ eventId, membershipId: memberId }) })).status, 401);
  currentActor = actor;
  assert.equal((await settingsRoute.PUT(jsonRequest(url, {}, "https://attacker.example"), context)).status, 403);
  assert.equal((await wefterRoute.PUT(jsonRequest(url, {}, "https://attacker.example"), { params: Promise.resolve({ eventId, membershipId: memberId }) })).status, 403);
  assert.deepEqual(calls, []);
});

test("valid mutations pass only server actor and path IDs and return private data", async () => {
  calls = []; currentActor = actor;
  const url = `https://weft.example/api/events/${eventId}/settings`;
  const settingsBody = { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };
  const savedSettings = await settingsRoute.PUT(jsonRequest(url, { expectedRevision: 1, settings: settingsBody }), context);
  assert.equal(savedSettings.status, 200);
  assert.equal(savedSettings.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(calls[0], ["updateSettings", eventId, actor.id, { expectedRevision: 1, settings: settingsBody }]);
  const savedWefter = await wefterRoute.PUT(jsonRequest(url, { expectedRevision: 0, assigned: true, availabilityWindows: [] }), { params: Promise.resolve({ eventId, membershipId: memberId }) });
  assert.equal(savedWefter.status, 200);
  assert.deepEqual(calls[1], ["updateWefter", eventId, memberId, actor.id, { expectedRevision: 0, assigned: true, availabilityWindows: [] }]);
});
