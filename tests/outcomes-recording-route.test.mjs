import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadTs, stubTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const nextHeaders = require("next/headers");
const nextCache = require("next/cache");
const userId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";
const matchId = "44444444-4444-4444-8444-444444444444";
const otherOrg = "55555555-5555-4555-8555-555555555555";
const urls = new URL(`/api/events/${eventId}/matches/${matchId}/outcome`, "https://weft.example");
const context = { params: Promise.resolve({ eventId, matchId }) };
const selectedOrg = (id, actorId = userId) => JSON.stringify({ organizationId: id, userId: actorId });
const creator = { userId, organizationId, role: "owner", active: true };
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");
let currentUser;
let memberships;
let selection;
const calls = [];
const unconfirmed = { trackingStartedAt: "2026-11-20T11:00:00.000Z", completedAt: null, revision: 0 };
const confirmed = { ...unconfirmed, completedAt: "2026-11-20T12:00:00.000Z", revision: 1 };

stubTs("@/infrastructure/auth/current-user", { getCurrentUser: async () => currentUser });
stubTs("@/infrastructure/auth/require-session", { requireClerkSession: async () => ({ subject: "test-subject" }) });
stubTs("@/modules/organizations/repository", { listActiveMemberships: async () => memberships });
stubTs("@/modules/insights/server/outcomes-service", {
  getMatchCompletion: async (scope) => {
    calls.push(["read", scope]);
    if (scope.organizationId !== organizationId) throw new ApplicationError("NOT_FOUND", "Match not found.");
    return unconfirmed;
  },
  setMatchCompletion: async (input) => {
    calls.push(["write", input]);
    if (input.expectedRevision > 0) throw new ApplicationError("CONFLICT", "Review the saved confirmation.");
    return confirmed;
  },
  startOutcomesTracking: async (input) => calls.push(["start", input]),
});

const route = loadTs("src/app/api/events/[eventId]/matches/[matchId]/outcome/route.ts");
const { startOutcomesTrackingAction } = loadTs("src/app/outcomes-actions.ts");
const scope = { userId, organizationId, eventId, matchId };
const put = (body, origin = urls.origin) => new Request(urls, {
  method: "PUT", body: JSON.stringify(body), headers: { origin, "content-type": "application/json" },
});

test.beforeEach((t) => {
  calls.length = 0;
  currentUser = { id: userId };
  memberships = [creator];
  selection = undefined;
  t.mock.method(nextHeaders, "cookies", async () => ({ get: () => selection === undefined ? undefined : { value: selection } }));
  t.mock.method(nextCache, "revalidatePath", (path) => calls.push(["refresh", path]));
});

test("the outcome read authorizes using the current local actor and the selected organization", async () => {
  currentUser = null;
  assert.equal((await route.GET(new Request(urls), context)).status, 401);
  currentUser = { id: userId };
  for (const role of ["staff", "sponsor", "inactive"]) {
    memberships = [{ ...creator, role: role === "inactive" ? "owner" : role, active: role !== "inactive" }];
    assert.equal((await route.GET(new Request(urls), context)).status, 403);
    assert.equal((await route.PUT(put({ completed: true, expectedRevision: 0 }), context)).status, 403);
  }
  memberships = [creator, { ...creator, organizationId: otherOrg, role: "organizer" }];
  assert.equal((await route.GET(new Request(urls), context)).status, 403);
  selection = selectedOrg(organizationId, otherOrg);
  assert.equal((await route.GET(new Request(urls), context)).status, 403);
  assert.deepEqual(calls, []);
  selection = selectedOrg(otherOrg);
  const hidden = await route.GET(new Request(urls), context);
  assert.equal(hidden.status, 404);
  assert.equal((await hidden.json()).data, undefined);
  selection = selectedOrg(organizationId);
  const allowed = await route.GET(new Request(urls), context);
  assert.equal(allowed.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await allowed.json(), { data: { completion: unconfirmed } });
  assert.deepEqual(calls, [["read", { ...scope, organizationId: otherOrg }], ["read", scope]]);
});

test("the outcome write rejects foreign origins, invalid revisions, and injected identity", async () => {
  const body = { completed: true, expectedRevision: 0 };
  assert.equal((await route.PUT(put(body, "https://other.example"), context)).status, 403);
  assert.equal((await route.PUT(put({ ...body, userId: otherOrg }), context)).status, 422);
  assert.equal((await route.PUT(put({ ...body, expectedRevision: -1 }), context)).status, 422);
  assert.equal((await route.PUT(put(body), { params: Promise.resolve({ eventId, matchId: "bad" }) })).status, 404);
  assert.deepEqual(calls, []);
  const updated = await route.PUT(put(body), context);
  assert.equal(updated.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await updated.json(), { data: { completion: confirmed } });
  assert.deepEqual(calls, [["write", { ...scope, ...body }], ["refresh", "/"], ["refresh", "/outcomes"]]);
  calls.length = 0;
  const conflict = await route.PUT(put({ completed: false, expectedRevision: 1 }), context);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, "CONFLICT");
  assert.deepEqual(calls, [["write", { ...scope, completed: false, expectedRevision: 1 }]]);
});

test("starting tracking validates the event, uses the selected scope and refreshes its report", async () => {
  const form = new FormData();
  form.set("eventId", eventId);
  await assert.rejects(startOutcomesTrackingAction(form), { digest: `NEXT_REDIRECT;replace;/outcomes?eventId=${eventId};307;` });
  assert.deepEqual(calls, [["start", { userId, organizationId, eventId }], ["refresh", "/"], ["refresh", "/outcomes"]]);
  calls.length = 0;
  form.append("eventId", eventId);
  await assert.rejects(startOutcomesTrackingAction(form), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  assert.deepEqual(calls, []);
});
