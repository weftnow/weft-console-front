import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const eventId = "22222222-2222-4222-8222-222222222222";
const guestA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guestB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const blockId = "44444444-4444-4444-8444-444444444444";
const handlers = loadTs("src/infrastructure/http/networking-handlers.ts");
const { ParticipationConflictError } = loadTs("src/modules/attendees/server/networking-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

const participation = (overrides = {}) => ({ guestId: guestA, status: "excluded", excludedAt: "2026-10-18T00:00:00.000Z", reason: "other", version: 2, ...overrides });
const block = { id: blockId, guestIds: [guestA, guestB], reason: null, createdAt: "2026-10-18T00:00:00.000Z" };
const excludeBody = { status: "excluded", reason: "other", expectedVersion: 1 };

function request(path, method, body, headers = {}) {
  return new Request(`https://weft.example/api/events/${eventId}${path}`, {
    method, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    headers: { origin: "https://weft.example", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
  });
}

function dependencies(overrides = {}) {
  return {
    getCurrentUser: async () => actor,
    updateGuestParticipation: async () => ({ participation: participation(), changed: true }),
    addMatchBlock: async () => ({ matchBlock: block, created: true }),
    removeMatchBlock: async () => {},
    ...overrides,
  };
}
const patch = (body, deps, ids = [eventId, guestA], headers) => handlers.handleUpdateGuestNetworking(request(`/guests/${guestA}/networking`, "PATCH", body, headers), ...ids, deps ?? dependencies());

test("every networking route returns 401 for anonymous actors before reading the body", async () => {
  const anonymous = dependencies({ getCurrentUser: async () => null });
  assert.equal((await patch(excludeBody, anonymous)).status, 401);
  assert.equal((await handlers.handleAddMatchBlock(request("/match-blocks", "POST", { guestIds: [guestA, guestB] }), eventId, anonymous)).status, 401);
  assert.equal((await handlers.handleRemoveMatchBlock(request(`/match-blocks/${blockId}`, "DELETE"), eventId, blockId, anonymous)).status, 401);
});

test("PATCH validates ids, origin, media type, JSON and body shape", async () => {
  assert.equal((await patch(excludeBody, undefined, ["bad", guestA])).status, 400);
  assert.equal((await patch(excludeBody, undefined, [eventId, "bad"])).status, 400);
  assert.equal((await patch(excludeBody, undefined, [eventId, guestA], { origin: "https://other.example" })).status, 403);
  assert.equal((await patch(excludeBody, undefined, [eventId, guestA], { "content-type": "text/plain" })).status, 415);
  assert.equal((await patch("{")).status, 400);
  const missingReason = await patch({ status: "excluded", expectedVersion: 1 });
  assert.equal(missingReason.status, 422);
  assert.equal((await patch({ ...excludeBody, userId: actor.id })).status, 422);
});

test("PATCH returns 200 with the participation and private no-store headers", async () => {
  let received;
  const response = await patch(excludeBody, dependencies({ updateGuestParticipation: async (args) => { received = args; return { participation: participation(), changed: true }; } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).data.participation, participation());
  assert.deepEqual(received, { userId: actor.id, eventId, guestId: guestA, data: excludeBody });
});

test("PATCH maps forbidden and not found and returns 409 with the latest saved participation", async () => {
  const failing = (error) => dependencies({ updateGuestParticipation: async () => { throw error; } });
  assert.equal((await patch(excludeBody, failing(new ApplicationError("FORBIDDEN", "no")))).status, 403);
  assert.equal((await patch(excludeBody, failing(new ApplicationError("NOT_FOUND", "no")))).status, 404);
  const conflict = await patch(excludeBody, failing(new ParticipationConflictError(participation({ status: "included", reason: null, excludedAt: null, version: 3 }))));
  assert.equal(conflict.status, 409);
  const body = await conflict.json();
  assert.equal(body.error.code, "CONFLICT");
  assert.equal(body.data.participation.version, 3);
  assert.equal(body.data.participation.status, "included");
  const unexpected = await patch(excludeBody, failing(new Error("SQL detail")));
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(JSON.stringify(await unexpected.json()), /SQL/);
});

test("POST match-blocks returns 201 for a new pair, 200 for an existing pair and 422 for bad input", async () => {
  const post = (body, deps) => handlers.handleAddMatchBlock(request("/match-blocks", "POST", body), eventId, deps ?? dependencies());
  const created = await post({ guestIds: [guestA, guestB] });
  assert.equal(created.status, 201);
  assert.deepEqual((await created.json()).data.matchBlock, block);
  assert.equal((await post({ guestIds: [guestB, guestA] }, dependencies({ addMatchBlock: async () => ({ matchBlock: block, created: false }) }))).status, 200);
  assert.equal((await post({ guestIds: [guestA, guestA] })).status, 422);
  assert.equal((await post({ guestIds: [guestA, guestB], createdBy: actor.id })).status, 422);
  const unknown = await post({ guestIds: [guestA, guestB] }, dependencies({ addMatchBlock: async () => { throw new ApplicationError("VALIDATION_ERROR", "Check the guests.", { guestIds: "Both guests must be on this event." }); } }));
  assert.equal(unknown.status, 422);
});

test("DELETE match-blocks returns 204, 404 and validates ids and origin", async () => {
  const remove = (deps, ids = [eventId, blockId], headers) => handlers.handleRemoveMatchBlock(request(`/match-blocks/${blockId}`, "DELETE", undefined, headers), ...ids, deps ?? dependencies());
  const ok = await remove();
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal((await remove(dependencies({ removeMatchBlock: async () => { throw new ApplicationError("NOT_FOUND", "no"); } }))).status, 404);
  assert.equal((await remove(dependencies({ removeMatchBlock: async () => { throw new ApplicationError("FORBIDDEN", "no"); } }))).status, 403);
  assert.equal((await remove(undefined, [eventId, "bad"])).status, 400);
  assert.equal((await remove(undefined, [eventId, blockId], { origin: "https://other.example" })).status, 403);
});
