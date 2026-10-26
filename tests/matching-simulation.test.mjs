import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const actorId = "11111111-1111-4111-8111-111111111111";

const { matchingEngineMode, selectStatusReader, selectFeedReader } = loadTs("src/modules/network/server/engine-mode.ts");
const { readEngineMatchingStatus } = loadTs("src/modules/network/server/matching-engine-client.ts");
const { readEngineMatchingFeed } = loadTs("src/modules/network/server/matching-feed-client.ts");
const { readSimulatedMatchingStatus, readSimulatedMatchingFeed, deterministicUuid, WAITING_MS, FINISH_MS } = loadTs("src/modules/network/server/simulated-engine.ts");
const { DEMO_MATCHES, MAX_DEMO_MATCHES } = loadTs("src/modules/network/simulation/demo-matches.ts");
const { engineMatchingStatusSchema, matchingStatusResultSchema } = loadTs("src/modules/network/matching-status-schemas.ts");
const { engineMatchingFeedSchema } = loadTs("src/modules/network/matching-feed-schemas.ts");
const { introductionPathFor } = loadTs("src/modules/network/match-rules.ts");
const { MatchesPanelView } = loadTs("src/modules/network/components/matches-panel.tsx");
const { MatchingStatusView } = loadTs("src/modules/network/components/matching-status-panel.tsx");
const { handleGetMatchingStatus } = loadTs("src/infrastructure/http/matching-status-handler.ts");
const { listMatches } = loadTs("src/modules/network/server/matches-service.ts");
const { matchListSchema } = loadTs("src/modules/network/matches-schemas.ts");
const { parseGuestCsvServer } = loadTs("src/modules/events/server/guest-csv-server.ts");

const smallCsv = readFileSync("public/demo/weft-demo-attendees.csv", "utf8");
const csvText = readFileSync("public/demo/weft-demo-attendees-300.csv", "utf8");
const csvRows = csvText.trim().split("\n").slice(1).map((line) => line.split(","));
const csvGuests = csvRows.map((cells) => ({ email: cells[2], guestType: cells[8] }));

const anchor = new Date("2026-10-20T10:00:00.000Z");
const at = (ms) => () => new Date(anchor.getTime() + ms);
const guestId = (index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
const demoGuests = (overrides = {}) => csvGuests.map(({ email }, index) => ({
  id: guestId(index), normalizedEmail: email, profileVersion: 0, networkingStatus: "included", ...overrides[email],
}));

function deps({ changes = [{ id: "c1", kind: "attendees_imported", guestIds: [], createdAt: anchor }], guests = demoGuests(), blocked = [], now = at(FINISH_MS) } = {}) {
  return {
    latestChangeAt: async () => changes.at(-1)?.createdAt ?? null,
    listChanges: async () => changes,
    findGuests: async (_event, emails) => guests.filter((guest) => emails.includes(guest.normalizedEmail)),
    listBlockedPairs: async () => blocked,
    now,
  };
}
const input = { organizationId, eventId };
const feedAfter = async (after, options = {}, extra = {}) => (await readSimulatedMatchingFeed({ ...input, after, ...extra }, deps(options)));

test("simulation is on only with the flag and never on Vercel production", () => {
  assert.equal(matchingEngineMode({}), "engine");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "simulation" }), "simulation");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "simulation", VERCEL_ENV: "preview" }), "simulation");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "simulation", VERCEL_ENV: "development" }), "simulation");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "simulation", VERCEL_ENV: "production" }), "engine");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "Simulation" }), "engine");
  assert.equal(matchingEngineMode({ WEFT_ENGINE_MODE: "" }), "engine");
});

test("the selected readers are the simulator or the real clients, never a mix", () => {
  const on = { WEFT_ENGINE_MODE: "simulation" };
  assert.equal(selectStatusReader(on), readSimulatedMatchingStatus);
  assert.equal(selectFeedReader(on), readSimulatedMatchingFeed);
  for (const env of [{}, { ...on, VERCEL_ENV: "production" }]) {
    assert.equal(selectStatusReader(env), readEngineMatchingStatus);
    assert.equal(selectFeedReader(env), readEngineMatchingFeed);
  }
});

test("status follows the latest saved change: idle, waiting, running, finished", async () => {
  const status = async (options) => readSimulatedMatchingStatus(input, deps(options));
  const idle = await status({ changes: [] });
  assert.equal(idle.status.state, "idle");
  assert.equal(idle.simulated, true);

  const cases = [
    [0, "waiting"], [WAITING_MS - 1, "waiting"], [WAITING_MS, "running"], [FINISH_MS - 1, "running"], [FINISH_MS, "finished"], [FINISH_MS + 3_600_000, "finished"],
  ];
  for (const [ms, state] of cases) {
    const result = await status({ now: at(ms) });
    assert.equal(result.availability, "available");
    assert.equal(result.status.state, state, `${ms} ms`);
    assert.equal(engineMatchingStatusSchema.safeParse(result.status).success, true);
    assert.equal(matchingStatusResultSchema.safeParse(result).success, true, "the Console result schema accepts the simulated flag");
  }
  const waiting = (await status({ now: at(1) })).status;
  assert.equal(waiting.pendingChanges, 1);
  assert.equal(waiting.lastFinishedRunId, null);
  const finished = (await status({ now: at(FINISH_MS) })).status;
  assert.equal(finished.pendingChanges, 0);
  assert.equal(finished.lastFinishedRunId, finished.latestRun.runId);
  assert.equal(finished.latestRun.finishedAt, new Date(anchor.getTime() + FINISH_MS).toISOString());
});

test("a new change of any kind restarts the run with a new deterministic run id", async () => {
  const first = (await readSimulatedMatchingStatus(input, deps({ now: at(FINISH_MS) }))).status;
  const again = (await readSimulatedMatchingStatus(input, deps({ now: at(FINISH_MS + 5_000) }))).status;
  assert.equal(again.lastFinishedRunId, first.lastFinishedRunId, "the id is stable across requests");

  const later = new Date(anchor.getTime() + 60_000);
  const changes = [
    { id: "c1", kind: "attendees_imported", guestIds: [], createdAt: anchor },
    { id: "c2", kind: "profile_updated", guestIds: [guestId(0)], createdAt: later },
  ];
  const restarted = (await readSimulatedMatchingStatus(input, deps({ changes, now: () => new Date(later.getTime() + 1_000) }))).status;
  assert.equal(restarted.state, "waiting");
  const done = (await readSimulatedMatchingStatus(input, deps({ changes, now: () => new Date(later.getTime() + FINISH_MS) }))).status;
  assert.equal(done.state, "finished");
  assert.notEqual(done.lastFinishedRunId, first.lastFinishedRunId);
  assert.notEqual(deterministicUuid("run", eventId, "a"), deterministicUuid("run", eventId, "b"));
  assert.match(done.lastFinishedRunId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("the feed stays empty until the run has finished, and keeps the caller's cursor", async () => {
  for (const ms of [0, WAITING_MS, FINISH_MS - 1]) {
    const result = await feedAfter(7, { now: at(ms) });
    assert.deepEqual(result, { availability: "available", feed: { entries: [], nextCursor: 7 } });
  }
  assert.deepEqual((await feedAfter(0, { changes: [] })).feed.entries, []);
});

test("a finished run issues every fixture pair with guests, in canonical order, and passes the engine schema", async () => {
  const result = await feedAfter(0);
  assert.equal(result.availability, "available");
  const { feed } = result;
  assert.equal(engineMatchingFeedSchema.safeParse(feed).success, true);
  assert.equal(feed.entries.length, DEMO_MATCHES.length);
  assert.deepEqual(feed.entries.map((entry) => entry.seq), DEMO_MATCHES.map((_, index) => index + 1));
  assert.equal(feed.nextCursor, DEMO_MATCHES.length);
  const guests = new Map(demoGuests().map((guest) => [guest.id, guest]));
  for (const entry of feed.entries) {
    const item = entry.recommendation;
    assert.equal(entry.kind, "issued");
    assert.ok(item.guestLowId < item.guestHighId);
    for (const id of [item.guestLowId, item.guestHighId]) assert.equal(item.profileVersions[id], guests.get(id).profileVersion);
    assert.equal(item.revokedAt, null);
  }
  const again = await feedAfter(0);
  assert.deepEqual(again, result, "replays are identical, so the cursor and conflict-skip logic keep them idempotent");
});

test("pairs with a missing guest are skipped and unknown guests are ignored", async () => {
  const missing = DEMO_MATCHES[2].a;
  const guests = demoGuests().filter((guest) => guest.normalizedEmail !== missing);
  const { feed } = await feedAfter(0, { guests });
  assert.equal(feed.entries.length, DEMO_MATCHES.length - DEMO_MATCHES.filter((pair) => pair.a === missing || pair.b === missing).length);
  assert.equal(feed.entries.some((entry) => entry.seq === 3), false);

  const stranger = { id: guestId(99), normalizedEmail: "someone.else@example.com", profileVersion: 0, networkingStatus: "included" };
  assert.equal((await feedAfter(0, { guests: [...demoGuests(), stranger] })).feed.entries.length, DEMO_MATCHES.length);
  assert.deepEqual((await feedAfter(0, { guests: [] })).feed, { entries: [], nextCursor: 0 });
});

test("after and limit page through the feed", async () => {
  const first = (await feedAfter(0, {}, { limit: 5 })).feed;
  assert.deepEqual(first.entries.map((entry) => entry.seq), [1, 2, 3, 4, 5]);
  assert.equal(first.nextCursor, 5);
  const second = (await feedAfter(first.nextCursor, {}, { limit: 5 })).feed;
  assert.deepEqual(second.entries.map((entry) => entry.seq), [6, 7, 8, 9, 10]);
  const rest = (await feedAfter(10)).feed;
  assert.deepEqual(rest.entries.map((entry) => entry.seq), DEMO_MATCHES.map((_, index) => index + 1).filter((seq) => seq > 10));
  assert.deepEqual((await feedAfter(DEMO_MATCHES.length)).feed, { entries: [], nextCursor: DEMO_MATCHES.length });
  for (const bad of [{ after: -1 }, { after: 0.5 }, { after: 0, limit: 0 }, { after: 0, limit: 201 }]) {
    assert.equal((await readSimulatedMatchingFeed({ ...input, ...bad }, deps())).reason, "invalid_response");
  }
});

test("an excluded guest's pairs are revoked in change order, after every issued seq", async () => {
  const target = DEMO_MATCHES[0].a;
  const targetId = guestId(csvGuests.findIndex((guest) => guest.email === target));
  const later = new Date(anchor.getTime() + 60_000);
  const changes = [
    { id: "c1", kind: "attendees_imported", guestIds: [], createdAt: anchor },
    { id: "c2", kind: "profile_updated", guestIds: [targetId], createdAt: new Date(anchor.getTime() + 30_000) },
    { id: "c3", kind: "guest_excluded", guestIds: [targetId], createdAt: later },
  ];
  const guests = demoGuests({ [target]: { networkingStatus: "excluded" } });
  const now = () => new Date(later.getTime() + FINISH_MS);
  const { feed } = await feedAfter(0, { changes, guests, now });
  assert.equal(engineMatchingFeedSchema.safeParse(feed).success, true);
  const revoked = feed.entries.filter((entry) => entry.kind === "revoked");
  const expected = DEMO_MATCHES.flatMap((pair, index) => (pair.a === target || pair.b === target ? [1_000 + 2 * 100 + index] : []));
  assert.deepEqual(revoked.map((entry) => entry.seq), expected);
  for (const entry of revoked) {
    assert.equal(entry.recommendation.revocationReason, "guest_excluded");
    assert.equal(entry.recommendation.revokedAt, later.toISOString());
    assert.equal(feed.entries.some((issued) => issued.kind === "issued" && issued.recommendation.recommendationId === entry.recommendation.recommendationId), true);
  }
  assert.ok(Math.min(...revoked.map((entry) => entry.seq)) > DEMO_MATCHES.length);

  const afterIssued = await feedAfter(DEMO_MATCHES.length, { changes, guests, now });
  assert.deepEqual(afterIssued.feed.entries.map((entry) => entry.seq), expected, "a cursor past the issued entries still sees the revocation");
});

test("a blocked pair is revoked as pair_blocked and an exclusion wins over a block", async () => {
  const [pair] = DEMO_MATCHES;
  const indexOf = (email) => csvGuests.findIndex((guest) => guest.email === email);
  const [low, high] = [guestId(indexOf(pair.a)), guestId(indexOf(pair.b))].sort();
  const later = new Date(anchor.getTime() + 60_000);
  const changes = [
    { id: "c1", kind: "attendees_imported", guestIds: [], createdAt: anchor },
    { id: "c2", kind: "match_block_added", guestIds: [low, high], createdAt: later },
  ];
  const now = () => new Date(later.getTime() + FINISH_MS);
  const { feed } = await feedAfter(0, { changes, blocked: [[low, high]], now });
  const revoked = feed.entries.filter((entry) => entry.kind === "revoked");
  assert.deepEqual(revoked.map((entry) => [entry.seq, entry.recommendation.revocationReason]), [[1_000 + 100 + 0, "pair_blocked"]]);

  const excluded = demoGuests({ [pair.a]: { networkingStatus: "excluded" } });
  const both = await feedAfter(0, { changes: [...changes, { id: "c3", kind: "guest_excluded", guestIds: [guestId(indexOf(pair.a))], createdAt: new Date(later.getTime() + 1_000) }], guests: excluded, blocked: [[low, high]], now: () => new Date(later.getTime() + 1_000 + FINISH_MS) });
  const reasons = both.feed.entries.filter((entry) => entry.kind === "revoked" && entry.recommendation.guestLowId === low).map((entry) => entry.recommendation.revocationReason);
  assert.deepEqual(reasons, ["guest_excluded"]);
});

test("the demo fixture is consistent with the demo CSV", () => {
  assert.equal(DEMO_MATCHES.length, MAX_DEMO_MATCHES);
  assert.equal(csvGuests.length, 300);
  assert.ok(csvText.startsWith(smallCsv.trim()), "the 24-guest file is the start of the 300-guest file");
  assert.equal(new Set(csvRows.map((cells) => cells[3])).size, 300, "phones are unique");
  const type = new Map(csvGuests.map((guest) => [guest.email, guest.guestType]));
  assert.equal(type.size, csvGuests.length, "emails are unique");
  const seen = new Set();
  const paths = new Set();
  for (const pair of DEMO_MATCHES) {
    assert.ok(type.has(pair.a) && type.has(pair.b), `${pair.a} / ${pair.b} are in the CSV`);
    assert.notEqual(pair.a, pair.b);
    const key = [pair.a, pair.b].sort().join();
    assert.equal(seen.has(key), false, `duplicate pair ${key}`);
    seen.add(key);
    paths.add(introductionPathFor(type.get(pair.a), type.get(pair.b)));
    assert.ok(pair.pairScore >= 0 && pair.pairScore <= 100 && pair.uncertainty && pair.evidence.length > 0);
    for (const side of [pair.forA, pair.forB]) assert.ok(side.benefit.length > 20 && side.score >= 0 && side.score <= 100);
  }
  const perGuest = new Map();
  for (const pair of DEMO_MATCHES) for (const email of [pair.a, pair.b]) perGuest.set(email, (perGuest.get(email) ?? 0) + 1);
  assert.ok(Math.max(...perGuest.values()) <= 5, "no guest has more than 5 matches");
  assert.ok([...perGuest.values()].filter((count) => count >= 3).length >= 10, "several guests have 3 or more matches");
  assert.deepEqual([...paths].sort(), ["sms_coordination", "wefter"], "both introduction paths are demonstrated");
  assert.ok(DEMO_MATCHES.some((pair) => [pair.a, pair.b].every((email) => type.get(email) === "Attendee")), "an Attendee-only pair exists");
  assert.ok(DEMO_MATCHES.some((pair) => [pair.a, pair.b].some((email) => type.get(email) === "VIP")), "a VIP pair exists");
  assert.ok(DEMO_MATCHES.some((pair) => [pair.a, pair.b].some((email) => type.get(email) === "Sponsor")), "a Sponsor pair exists");
  for (const email of type.keys()) assert.match(email, /^[a-z.]+@demo\.weft\.example$/);
});

test("both demo CSVs are accepted by the server CSV parser", () => {
  assert.equal(parseGuestCsvServer(smallCsv).guests.length, 24);
  const result = parseGuestCsvServer(csvText);
  assert.equal(result.guests.length, 300);
  assert.equal(result.guests.filter((guest) => guest.guestType === "VIP").length, csvGuests.filter((guest) => guest.guestType === "VIP").length);
});

const authorizedDeps = (overrides = {}) => ({
  findOrganizationId: async () => organizationId,
  requireCreator: async () => ({}),
  sync: async () => ({ state: "synced" }),
  listMatches: async () => ({ rows: [], guests: new Map(), counts: { active: 0, revoked: 0 } }),
  findMatch: async () => null,
  findProfile: async () => null,
  ...overrides,
});

test("the match list says it is simulated only in simulation mode, and stays denied for non-creators", async () => {
  const on = await listMatches({ userId: actorId, eventId }, authorizedDeps({ isSimulated: () => true }));
  assert.equal(on.simulated, true);
  assert.equal(matchListSchema.safeParse(on).success, true);
  const off = await listMatches({ userId: actorId, eventId }, authorizedDeps({ isSimulated: () => false }));
  assert.equal("simulated" in off, false);
  assert.equal("simulated" in (await listMatches({ userId: actorId, eventId }, authorizedDeps())), false);

  let reached = false;
  const denied = authorizedDeps({
    requireCreator: async () => { throw new Error("denied"); },
    sync: async () => { reached = true; return { state: "synced" }; },
    isSimulated: () => true,
  });
  await assert.rejects(() => listMatches({ userId: actorId, eventId }, denied), /denied/);
  assert.equal(reached, false, "the simulator is never reached before authorization");
});

test("the demo is flagged invisibly: data attribute, response header and no visible text", async () => {
  const status = engineMatchingStatusSchema.parse({ state: "finished", pendingChanges: 0, latestRun: null, lastFinishedRunId: null, nextAttemptAt: null, automaticEnabled: true });
  const view = (result) => renderToStaticMarkup(React.createElement(MatchingStatusView, { kind: "result", result, onRetry() {} }));
  assert.match(view({ availability: "available", status, simulated: true }), /data-simulated="true"/);
  assert.doesNotMatch(view({ availability: "available", status }), /data-simulated/);
  const panel = (simulated) => renderToStaticMarkup(React.createElement(MatchesPanelView, { body: null, summary: null, simulated }));
  assert.match(panel(true), /data-simulated="true"/);
  assert.doesNotMatch(panel(false), /data-simulated/);
  assert.doesNotMatch(panel(true) + view({ availability: "available", status, simulated: true }), /Demo data|simulated matching/i);

  const handler = { getCurrentUser: async () => ({ id: actorId }), getMatchingStatus: async () => ({ availability: "available", status, simulated: true }) };
  const call = () => handleGetMatchingStatus(new Request("https://weft.example/x"), eventId, handler);
  const before = process.env.WEFT_ENGINE_MODE;
  try {
    process.env.WEFT_ENGINE_MODE = "simulation";
    assert.equal((await call()).headers.get("x-weft-engine-mode"), "simulation");
    process.env.WEFT_ENGINE_MODE = "";
    assert.equal((await call()).headers.get("x-weft-engine-mode"), null);
  } finally {
    if (before === undefined) delete process.env.WEFT_ENGINE_MODE; else process.env.WEFT_ENGINE_MODE = before;
  }
});
