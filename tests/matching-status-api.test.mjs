import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";
const TOKEN = "engine-secret-token";
const env = { WEFT_ENGINE_URL: "https://engine.example/api/", WEFT_ENGINE_SERVICE_TOKEN: TOKEN };

const { handleGetMatchingStatus } = loadTs("src/infrastructure/http/matching-status-handler.ts");
const { getMatchingStatus } = loadTs("src/modules/network/server/matching-status-service.ts");
const { readEngineMatchingStatus } = loadTs("src/modules/network/server/matching-engine-client.ts");
const { requireEventCreator } = loadTs("src/modules/organizations/service.ts");
const { describeMatchingStatus } = loadTs("src/modules/network/matching-status-copy.ts");
const { MatchingStatusView } = loadTs("src/modules/network/components/matching-status-panel.tsx");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

const engineStatus = (overrides = {}) => ({
  state: "finished", pendingChanges: 0,
  latestRun: { runId, status: "finished", trigger: "change", failure: null, createdAt: "2026-10-19T12:00:00.123456Z", finishedAt: "2026-10-19T12:02:00Z" },
  lastFinishedRunId: runId, nextAttemptAt: null, automaticEnabled: true, ...overrides,
});
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const get = (deps, id = eventId) => handleGetMatchingStatus(new Request(`https://weft.example/api/events/${id}/matching-status`), id, deps);

test("the engine client sends the server-held credential to the organization's event and parses the status", async () => {
  let seen;
  const result = await readEngineMatchingStatus({ organizationId, eventId }, {
    env, fetcher: async (url, init) => { seen = { url: String(url), init }; return jsonResponse(engineStatus()); },
  });
  assert.equal(seen.url, `https://engine.example/api/v1/organizations/${organizationId}/events/${eventId}/matching/status`);
  assert.equal(seen.init.method, "GET");
  assert.equal(seen.init.headers["X-Weft-Service-Token"], TOKEN);
  assert.equal(seen.init.redirect, "error", "the credential is never replayed to a redirect target");
  assert.ok(seen.init.signal instanceof AbortSignal);
  assert.deepEqual(result, { availability: "available", status: engineStatus() });
});

test("failure text from the engine is dropped before it can reach a browser", async () => {
  const noisy = engineStatus({ state: "failed", latestRun: { ...engineStatus().latestRun, status: "failed", failure: { code: "provider_failure", message: "stack trace with profile text" }, finishedAt: null } });
  const result = await readEngineMatchingStatus({ organizationId, eventId }, { env, fetcher: async () => jsonResponse(noisy) });
  assert.deepEqual(result.status.latestRun.failure, { code: "provider_failure" });
  assert.doesNotMatch(JSON.stringify(result), /profile text|stack trace/);
});

test("the engine client reports typed unavailability without leaking the address or credential", async () => {
  const cases = [
    [{ env: {} }, "not_configured"],
    [{ env: { WEFT_ENGINE_URL: "https://engine.example" } }, "not_configured"],
    [{ env: { ...env, WEFT_ENGINE_URL: "http://engine.example" } }, "not_configured"],
    [{ env: { ...env, WEFT_ENGINE_URL: "https://user:pass@engine.example" } }, "not_configured"],
    [{ env, fetcher: async () => jsonResponse({}, 503) }, "unreachable"],
    [{ env, fetcher: async () => jsonResponse({}, 403) }, "unreachable"],
    [{ env, fetcher: async () => { throw new TypeError(`connect ECONNREFUSED engine.example ${TOKEN}`); } }, "unreachable"],
    [{ env, fetcher: async () => new Response("not json") }, "invalid_response"],
    [{ env, fetcher: async () => jsonResponse({ state: "exploding" }) }, "invalid_response"],
    [{ env, fetcher: async () => jsonResponse(engineStatus({ pendingChanges: -1 })) }, "invalid_response"],
  ];
  for (const [options, reason] of cases) {
    const result = await readEngineMatchingStatus({ organizationId, eventId }, options);
    assert.deepEqual(result, { availability: "unavailable", reason });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(`${TOKEN}|engine\\.example`));
  }
  assert.deepEqual(await readEngineMatchingStatus({ organizationId: "not-a-uuid", eventId }, { env, fetcher: async () => jsonResponse(engineStatus()) }), { availability: "unavailable", reason: "invalid_response" });
  assert.deepEqual(await readEngineMatchingStatus({ organizationId, eventId }, { env: { ...env, WEFT_ENGINE_URL: "http://localhost:8000" }, fetcher: async () => jsonResponse(engineStatus()) }).then((r) => r.availability), "available", "plain http is allowed only for loopback development");
});

test("the engine client gives up after the timeout instead of hanging the page", async () => {
  const hanging = (_url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  const result = await readEngineMatchingStatus({ organizationId, eventId }, { env, fetcher: hanging, timeoutMs: 20 });
  assert.deepEqual(result, { availability: "unavailable", reason: "unreachable" });
});

function service(role, overrides = {}) {
  const calls = [];
  const dependencies = {
    findOrganizationId: async () => organizationId,
    requireCreator: (args) => requireEventCreator(args, { findMembership: async () => (role ? { active: role !== "inactive-owner", role: role === "inactive-owner" ? "owner" : role, organizationName: "Org" } : null) }),
    readStatus: async (args) => { calls.push(args); return { availability: "available", status: engineStatus() }; },
    ...overrides,
  };
  return { dependencies, calls };
}

test("only active Owners and Organizers can read the status, and the engine is asked for their organization", async () => {
  for (const role of ["owner", "organizer"]) {
    const { dependencies, calls } = service(role);
    assert.equal((await getMatchingStatus({ userId: actor.id, eventId }, dependencies)).availability, "available");
    assert.deepEqual(calls, [{ organizationId, eventId }]);
  }
  for (const role of ["staff", "sponsor", "inactive-owner", null]) {
    const { dependencies, calls } = service(role);
    await assert.rejects(() => getMatchingStatus({ userId: actor.id, eventId }, dependencies), { code: "FORBIDDEN" });
    assert.deepEqual(calls, [], `the engine is never contacted for ${role}`);
  }
  const { dependencies } = service("owner", { findOrganizationId: async () => null });
  await assert.rejects(() => getMatchingStatus({ userId: actor.id, eventId }, dependencies), { code: "NOT_FOUND" });
  await assert.rejects(() => getMatchingStatus({ userId: actor.id, eventId: "bad" }, service("owner").dependencies), { code: "NOT_FOUND" });
});

test("GET returns 401 for anonymous callers, 400 for malformed ids and never calls the service first", async () => {
  let called = false;
  const deps = (overrides) => ({ getCurrentUser: async () => actor, getMatchingStatus: async () => { called = true; return { availability: "available", status: engineStatus() }; }, ...overrides });
  assert.equal((await get(deps({ getCurrentUser: async () => null }))).status, 401);
  assert.equal((await get(deps(), "bad")).status, 400);
  assert.equal(called, false);
});

test("GET returns the typed available and unavailable results with private no-store headers", async () => {
  const available = await get({ getCurrentUser: async () => actor, getMatchingStatus: async (args) => { assert.deepEqual(args, { userId: actor.id, eventId }); return { availability: "available", status: engineStatus() }; } });
  assert.equal(available.status, 200);
  assert.equal(available.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await available.json()).data, { availability: "available", status: engineStatus() });
  const unavailable = await get({ getCurrentUser: async () => actor, getMatchingStatus: async () => ({ availability: "unavailable", reason: "unreachable" }) });
  assert.equal(unavailable.status, 200);
  assert.deepEqual((await unavailable.json()).data, { availability: "unavailable", reason: "unreachable" });
});

test("GET maps denied and unknown events and hides unexpected errors", async () => {
  const failing = (error) => ({ getCurrentUser: async () => actor, getMatchingStatus: async () => { throw error; } });
  assert.equal((await get(failing(new ApplicationError("FORBIDDEN", "no")))).status, 403);
  assert.equal((await get(failing(new ApplicationError("NOT_FOUND", "no")))).status, 404);
  const unexpected = await get(failing(new Error("engine at https://engine.example token engine-secret-token")));
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(JSON.stringify(await unexpected.json()), /engine|token/);
});

const format = () => "2 min ago";
const copyFor = (overrides) => describeMatchingStatus(engineStatus(overrides), format);

test("status copy describes each state in plain language without raw engine text", () => {
  assert.equal(copyFor({ state: "idle", latestRun: null, lastFinishedRunId: null }).label, "Not started");
  assert.match(copyFor({ state: "waiting", pendingChanges: 3 }).detail, /3 saved changes will be matched/);
  assert.match(copyFor({ state: "waiting", pendingChanges: 1 }).detail, /1 saved change will be matched/);
  assert.match(copyFor({ state: "waiting", pendingChanges: 0, nextAttemptAt: "2026-10-19T12:05:00Z" }).detail, /try again automatically/);
  assert.equal(copyFor({ state: "running" }).label, "Matching in progress");
  assert.equal(copyFor({ state: "failed", latestRun: { ...engineStatus().latestRun, status: "failed", failure: { code: "provider_failure" } } }).tone, "problem");
  assert.doesNotMatch(copyFor({ state: "failed", latestRun: { ...engineStatus().latestRun, status: "failed", failure: { code: "provider_failure" } } }).detail, /provider_failure/);
  assert.equal(copyFor({ state: "invalid_result" }).label, "Result not used");
  assert.match(copyFor({}).detail, /Last completed 2 min ago/);
  assert.equal(copyFor({}).source, "Started automatically by saved changes");
  assert.equal(copyFor({ latestRun: { ...engineStatus().latestRun, trigger: "api" } }).source, "Requested by Weft");
});

test("a switched-off engine says saved changes are not being matched", () => {
  assert.match(copyFor({ state: "idle", latestRun: null, automaticEnabled: false }).detail, /switched off/);
  assert.match(copyFor({ state: "waiting", pendingChanges: 2, automaticEnabled: false }).detail, /2 saved changes are not being matched yet/);
});

test("the panel is read-only: no start control, no invented results, retry only when unavailable", () => {
  const view = (props) => renderToStaticMarkup(React.createElement(MatchingStatusView, { onRetry() {}, ...props }));
  const available = view({ kind: "result", result: { availability: "available", status: engineStatus({ state: "running" }) } });
  assert.match(available, /Matching status/);
  assert.match(available, /Matching in progress/);
  assert.match(available, /aria-live="polite"/);
  assert.doesNotMatch(available, /<button|<form|<input|href=/);
  assert.doesNotMatch(available, /pair|introduc|recommend/i);
  assert.match(view({ kind: "loading" }), /Checking matching status/);
  const unavailable = view({ kind: "result", result: { availability: "unavailable", reason: "not_configured" } });
  assert.match(unavailable, /isn’t connected in this environment yet/);
  assert.match(unavailable, /Check again/);
  assert.doesNotMatch(unavailable, /Start|Run matching|Approve/i);
  assert.match(view({ kind: "error" }), /couldn’t be loaded/);
});
