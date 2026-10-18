import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const eventId = "22222222-2222-4222-8222-222222222222";
const guestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const handlers = loadTs("src/infrastructure/http/profile-handlers.ts");
const { ProfileConflictError } = loadTs("src/modules/attendees/server/profile-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

const blank = { summary: null, goals: null, offers: null, desiredConnections: null, avoid: null, background: null, linkedinDetails: null, missingDetails: null };
const profile = (overrides = {}) => ({ guestId, version: 1, fields: { ...blank, goals: "Raise a seed round" }, organizerOnly: [], savedAt: "2026-10-19T00:00:00.000Z", savedBy: "Ada", ...overrides });
const read = (overrides = {}) => ({
  profile: profile(overrides),
  completeness: { goals: "available", offers: "missing", desiredConnections: "missing", background: "missing", linkedin: "url_only" },
  summary: { summary: null, details: [{ key: "goals", label: "Goals", value: "Raise a seed round" }] },
});
const body = { fields: { ...blank, goals: "Raise a seed round" }, organizerOnly: [], expectedVersion: 0 };

function request(method, payload, headers = {}) {
  return new Request(`https://weft.example/api/events/${eventId}/guests/${guestId}/profile`, {
    method, body: payload === undefined ? undefined : typeof payload === "string" ? payload : JSON.stringify(payload),
    headers: { origin: "https://weft.example", ...(payload === undefined ? {} : { "content-type": "application/json" }), ...headers },
  });
}

function dependencies(overrides = {}) {
  return {
    getCurrentUser: async () => actor,
    getGuestProfile: async () => read(),
    saveGuestProfile: async () => ({ profile: profile(), changed: true, read: read() }),
    ...overrides,
  };
}
const put = (payload, deps, ids = [eventId, guestId], headers) => handlers.handleSaveGuestProfile(request("PUT", payload, headers), ...ids, deps ?? dependencies());
const get = (deps, ids = [eventId, guestId], headers) => handlers.handleGetGuestProfile(request("GET", undefined, headers), ...ids, deps ?? dependencies());

test("GET and PUT return 401 for anonymous actors", async () => {
  const anonymous = dependencies({ getCurrentUser: async () => null });
  assert.equal((await get(anonymous)).status, 401);
  assert.equal((await put(body, anonymous)).status, 401);
});

test("GET returns the profile, completeness and shareable summary with private no-store headers", async () => {
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).data, read());
  assert.equal((await get(undefined, ["bad", guestId])).status, 400);
  assert.equal((await get(undefined, [eventId, "bad"])).status, 400);
});

test("GET maps forbidden and not found", async () => {
  const failing = (error) => dependencies({ getGuestProfile: async () => { throw error; } });
  assert.equal((await get(failing(new ApplicationError("FORBIDDEN", "no")))).status, 403);
  assert.equal((await get(failing(new ApplicationError("NOT_FOUND", "no")))).status, 404);
});

test("PUT validates ids, origin, media type, JSON and body shape", async () => {
  assert.equal((await put(body, undefined, ["bad", guestId])).status, 400);
  assert.equal((await put(body, undefined, [eventId, "bad"])).status, 400);
  assert.equal((await put(body, undefined, [eventId, guestId], { origin: "https://other.example" })).status, 403);
  assert.equal((await put(body, undefined, [eventId, guestId], { "content-type": "text/plain" })).status, 415);
  assert.equal((await put("{")).status, 400);
  assert.equal((await put({ ...body, fields: { goals: "x" } })).status, 422);
  assert.equal((await put({ ...body, userId: actor.id })).status, 422);
  assert.equal((await put({ ...body, organizerOnly: ["summary"] })).status, 422);
  assert.equal((await put({ ...body, fields: { ...body.fields, goals: "x".repeat(2001) } })).status, 422);
});

test("PUT returns 200 with the saved profile and passes the parsed input and actor to the service", async () => {
  let received;
  const response = await put({ ...body, fields: { ...body.fields, goals: "  Raise a seed round " } }, dependencies({
    saveGuestProfile: async (args) => { received = args; return { profile: profile(), changed: true, read: read() }; },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).data, read());
  assert.deepEqual(received, { userId: actor.id, eventId, guestId, data: body });
});

test("PUT maps forbidden and not found, and returns 409 with the latest saved profile on a stale version", async () => {
  const failing = (error) => dependencies({ saveGuestProfile: async () => { throw error; } });
  assert.equal((await put(body, failing(new ApplicationError("FORBIDDEN", "no")))).status, 403);
  assert.equal((await put(body, failing(new ApplicationError("NOT_FOUND", "no")))).status, 404);
  const conflict = await put(body, failing(new ProfileConflictError(profile({ version: 4 }))));
  assert.equal(conflict.status, 409);
  const json = await conflict.json();
  assert.equal(json.error.code, "CONFLICT");
  assert.equal(json.data.profile.version, 4);
  const unexpected = await put(body, failing(new Error("SQL detail")));
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(JSON.stringify(await unexpected.json()), /SQL/);
});
