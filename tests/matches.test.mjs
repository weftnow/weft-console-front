import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";
const lowId = "00000000-0000-4000-8000-00000000000a";
const highId = "00000000-0000-4000-8000-00000000000b";
const matchId = "55555555-5555-4555-8555-555555555555";
const TOKEN = "engine-secret-token";
const env = { WEFT_ENGINE_URL: "https://engine.example/api/", WEFT_ENGINE_SERVICE_TOKEN: TOKEN };

const { readEngineMatchingFeed } = loadTs("src/modules/network/server/matching-feed-client.ts");
const { engineMatchingFeedSchema } = loadTs("src/modules/network/matching-feed-schemas.ts");
const { introductionPathFor, revocationReasonForIssued, pinnedVersionsAreKnown } = loadTs("src/modules/network/match-rules.ts");
const { toMatchSummary, toMatchDetail } = loadTs("src/modules/network/match-dtos.ts");
const { syncEventMatches, syncAfterFinishedRun, MAX_SYNC_PAGES } = loadTs("src/modules/network/server/match-sync-service.ts");
const { InvalidFeedError } = loadTs("src/modules/network/server/match-repository.ts");
const { listMatches, getMatch } = loadTs("src/modules/network/server/matches-service.ts");
const { handleListMatches, handleGetMatch } = loadTs("src/infrastructure/http/matches-handler.ts");
const { requireEventCreator } = loadTs("src/modules/organizations/service.ts");
const { describeSync, emptyMatchesCopy, revocationReasonCopy, MATCHES_SUBTITLE, introductionPathLabels } = loadTs("src/modules/network/matches-copy.ts");
const { MatchesList, MatchDetailView, MatchesPanelView } = loadTs("src/modules/network/components/matches-panel.tsx");
const { getEventDetailTab } = loadTs("src/modules/events/event-record.ts");

const recommendation = (overrides = {}) => ({
  recommendationId: matchId, guestLowId: lowId, guestHighId: highId,
  profileVersions: { [lowId]: 1, [highId]: 2 }, directionalScores: { [lowId]: 80, [highId]: 70 }, pairScore: 75,
  benefits: { [lowId]: "Ada can meet an investor.", [highId]: "Bea can meet a founder." },
  evidence: [{ guestId: lowId, field: "goals", quote: "Looking for seed investors" }],
  missingInformation: { [lowId]: [], [highId]: ["Funding stage"] }, uncertainty: "Stage is unclear.",
  shareableReasons: { [lowId]: "You are both in fintech.", [highId]: null }, revokedAt: null, revocationReason: null, ...overrides,
});
const entry = (seq, kind = "issued", overrides = {}) => ({ seq, kind, runId, recommendation: recommendation(overrides) });
const feed = (entries, nextCursor = entries.at(-1)?.seq ?? 0) => ({ entries, nextCursor });
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("the feed schema accepts the engine contract and ignores nothing unsafe", () => {
  assert.equal(engineMatchingFeedSchema.safeParse(feed([entry(1), entry(2, "revoked", { revokedAt: "2026-10-19T12:00:00Z", revocationReason: "guest_excluded" })])).success, true);
  assert.equal(engineMatchingFeedSchema.safeParse(feed([])).success, true);
  const bad = [
    feed([entry(2), entry(1)]),
    feed([entry(1, "issued", { guestLowId: highId, guestHighId: lowId })]),
    feed([entry(1, "issued", { benefits: { [lowId]: "x" } })]),
    feed([entry(1, "issued", { pairScore: 101 })]),
    feed([entry(1, "revoked")]),
    feed([entry(1, "issued", { revocationReason: "guest_excluded" })]),
    { entries: [entry(5)], nextCursor: 2 },
    feed(Array.from({ length: 201 }, (_, index) => entry(index + 1))),
  ];
  for (const value of bad) assert.equal(engineMatchingFeedSchema.safeParse(value).success, false);
});

test("the feed client sends the credential, cursor and limit, and parses the page", async () => {
  let seen;
  const result = await readEngineMatchingFeed({ organizationId, eventId, after: 7, limit: 50 }, {
    env, fetcher: async (url, init) => { seen = { url: new URL(String(url)), init }; return jsonResponse(feed([entry(8)])); },
  });
  assert.equal(seen.url.pathname, `/api/v1/organizations/${organizationId}/events/${eventId}/matching/feed`);
  assert.equal(seen.url.searchParams.get("after"), "7");
  assert.equal(seen.url.searchParams.get("limit"), "50");
  assert.equal(seen.init.headers["X-Weft-Service-Token"], TOKEN);
  assert.equal(seen.init.redirect, "error");
  assert.ok(seen.init.signal instanceof AbortSignal);
  assert.equal(result.availability, "available");
  assert.equal(result.feed.entries[0].seq, 8);
});

test("feed failures are typed and never leak the address or credential", async () => {
  const cases = [
    [{ env: {} }, "not_configured"],
    [{ env: { ...env, WEFT_ENGINE_URL: "http://engine.example" } }, "not_configured"],
    [{ env, fetcher: async () => jsonResponse({}, 503) }, "unreachable"],
    [{ env, fetcher: async () => { throw new TypeError(`connect ECONNREFUSED engine.example ${TOKEN}`); } }, "unreachable"],
    [{ env, fetcher: async () => new Response("nope") }, "invalid_response"],
    [{ env, fetcher: async () => jsonResponse({ entries: "x" }) }, "invalid_response"],
    [{ env, fetcher: async () => jsonResponse(feed([entry(1, "issued", { pairScore: 500 })])) }, "invalid_response"],
  ];
  for (const [options, reason] of cases) {
    const result = await readEngineMatchingFeed({ organizationId, eventId, after: 0 }, options);
    assert.deepEqual(result, { availability: "unavailable", reason });
    assert.doesNotMatch(JSON.stringify(result), new RegExp(`${TOKEN}|engine\\.example`));
  }
  const fetcher = async () => jsonResponse(feed([]));
  for (const input of [{ after: -1 }, { after: 1.5 }, { after: 0, limit: 201 }, { after: 0, limit: 0 }, { organizationId: "bad", after: 0 }]) {
    assert.equal((await readEngineMatchingFeed({ organizationId, eventId, ...input }, { env, fetcher })).reason, "invalid_response");
  }
  const hanging = (_url, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  assert.equal((await readEngineMatchingFeed({ organizationId, eventId, after: 0 }, { env, fetcher: hanging, timeoutMs: 20 })).reason, "unreachable");
});

const guest = (id, overrides = {}) => ({ id, personId: `person-${id}`, guestType: "Attendee", networkingStatus: "included", profileVersion: 2, ...overrides });

test("the introduction path comes from guest types", () => {
  assert.equal(introductionPathFor("Attendee", "Attendee"), "sms_coordination");
  for (const [a, b] of [["VIP", "Attendee"], ["Attendee", "Sponsor"], ["VIP", "Sponsor"]]) assert.equal(introductionPathFor(a, b), "wefter");
  assert.equal(introductionPathFor("Attendee", "VIP"), introductionPathFor("VIP", "Attendee"), "A+B equals B+A");
});

test("an issued pair is re-checked against Console data and keeps one reason", () => {
  const a = guest(lowId); const b = guest(highId);
  assert.equal(revocationReasonForIssued(a, b, []), null);
  assert.equal(revocationReasonForIssued(guest(lowId, { networkingStatus: "excluded" }), b, []), "guest_excluded");
  assert.equal(revocationReasonForIssued(a, guest(highId, { networkingStatus: "excluded" }), [{ guestIds: [lowId, highId] }]), "guest_excluded");
  assert.equal(revocationReasonForIssued(a, b, [{ guestIds: [lowId, highId] }]), "pair_blocked");
  assert.equal(revocationReasonForIssued(a, b, [{ guestIds: [lowId, "00000000-0000-4000-8000-0000000000ff"] }]), null);
  assert.equal(revocationReasonForIssued(guest(lowId, { personId: "same" }), guest(highId, { personId: "same" }), []), "identity_resolution_required");
});

test("pinned profile versions older than current are fine, newer are not", () => {
  const a = guest(lowId, { profileVersion: 3 }); const b = guest(highId, { profileVersion: 2 });
  assert.equal(pinnedVersionsAreKnown(a, b, { low: 1, high: 2 }), true, "a profile edit after the run does not invalidate a match");
  assert.equal(pinnedVersionsAreKnown(a, b, { low: 4, high: 2 }), false);
});

function syncDeps(pages, overrides = {}) {
  const state = { cursor: 0, checked: null, applied: [], reads: [] };
  const deps = {
    readCursor: async () => ({ lastSeq: state.cursor, checkedThroughRunId: state.checked }),
    readFeed: async ({ after }) => { state.reads.push(after); const page = pages.shift(); return page ?? { availability: "available", feed: feed([], after) }; },
    applyPage: async (id, after, f) => { state.applied.push({ id, after, count: f.entries.length }); state.cursor = f.nextCursor; return { applied: true, created: f.entries.length, revoked: 0, skipped: 0 }; },
    markCheckedThrough: async (_id, run) => { state.checked = run; },
    ...overrides,
  };
  return { deps, state };
}
const available = (f) => ({ availability: "available", feed: f });

test("sync applies a page from the stored cursor and records the finished run", async () => {
  const { deps, state } = syncDeps([available(feed([entry(1), entry(2)]))]);
  assert.deepEqual(await syncEventMatches({ organizationId, eventId, finishedRunId: runId }, deps), { state: "synced" });
  assert.deepEqual(state.applied, [{ id: eventId, after: 0, count: 2 }]);
  assert.equal(state.cursor, 2);
  assert.equal(state.checked, runId);
});

test("sync follows full pages but stops after the page bound", async () => {
  const full = (from) => available(feed(Array.from({ length: 200 }, (_, i) => entry(from + i))));
  const { deps, state } = syncDeps([full(1), full(201), available(feed([entry(401)]))]);
  await syncEventMatches({ organizationId, eventId }, deps);
  assert.deepEqual(state.reads, [0, 200, 400]);
  const endless = syncDeps([]);
  endless.deps.readFeed = async ({ after }) => available(feed(Array.from({ length: 200 }, (_, i) => entry(after + i + 1))));
  await syncEventMatches({ organizationId, eventId, finishedRunId: runId }, endless.deps);
  assert.equal(endless.state.applied.length, MAX_SYNC_PAGES);
  assert.equal(endless.state.checked, null, "an unfinished backlog is not marked as caught up");
});

test("an unavailable engine is reported and nothing is applied or marked", async () => {
  for (const reason of ["not_configured", "unreachable", "invalid_response"]) {
    const { deps, state } = syncDeps([{ availability: "unavailable", reason }]);
    assert.deepEqual(await syncEventMatches({ organizationId, eventId, finishedRunId: runId }, deps), { state: "unavailable", reason });
    assert.deepEqual(state.applied, []);
    assert.equal(state.checked, null);
  }
  const { deps } = syncDeps([available(feed([entry(1)]))], { applyPage: async () => { throw new InvalidFeedError("future version"); } });
  assert.deepEqual(await syncEventMatches({ organizationId, eventId }, deps), { state: "unavailable", reason: "invalid_response" });
  const failing = syncDeps([available(feed([entry(1)]))], { applyPage: async () => { throw new Error("db down"); } });
  await assert.rejects(() => syncEventMatches({ organizationId, eventId }, failing.deps), /db down/);
});

test("the status trigger syncs once per finished run and swallows failures", async () => {
  const first = syncDeps([available(feed([entry(1)]))]);
  await syncAfterFinishedRun({ organizationId, eventId, runId }, first.deps);
  assert.equal(first.state.checked, runId);
  await syncAfterFinishedRun({ organizationId, eventId, runId }, first.deps);
  assert.equal(first.state.reads.length, 1, "no second feed request for a run that was already synced");
  const broken = syncDeps([], { readCursor: async () => { throw new Error("db down"); } });
  await assert.doesNotReject(() => syncAfterFinishedRun({ organizationId, eventId, runId }, broken.deps));
});

const now = new Date("2026-10-19T12:00:00Z");
const row = (overrides = {}) => ({
  id: matchId, status: "active", introductionPath: "sms_coordination", pairScore: 75, guestLowId: lowId, guestHighId: highId, sourceRunId: runId,
  profileVersionLow: 1, profileVersionHigh: 2, scoreLow: 80, scoreHigh: 70,
  benefits: recommendation().benefits, shareableReasons: recommendation().shareableReasons, missingInformation: recommendation().missingInformation,
  evidence: recommendation().evidence, uncertainty: "Stage is unclear.", createdAt: now, revokedAt: null, revocationReason: null, ...overrides,
});
const guestRow = (id, first) => ({ id, firstName: first, lastName: "Guest", company: "Acme", jobPosition: "Founder", guestType: "Attendee", networkingStatus: "included", profileVersion: 2, personId: `person-${id}`, email: "secret@example.com", phone: "+6590000000" });

test("summaries and details carry no contact details and keep the pair order", () => {
  const low = guestRow(lowId, "Ada"); const high = guestRow(highId, "Bea");
  const summary = toMatchSummary(row(), low, high);
  assert.deepEqual(summary.guests.map((g) => g.id), [lowId, highId]);
  assert.equal(summary.reasonPreview, "You are both in fintech.");
  const long = toMatchSummary(row({ shareableReasons: { [lowId]: null, [highId]: null }, benefits: { [lowId]: "x".repeat(400), [highId]: null } }), low, high);
  assert.equal(long.reasonPreview.length, 160);
  const detail = toMatchDetail({
    row: row({ status: "revoked", revokedAt: now, revocationReason: "pair_blocked" }), low, high,
    profiles: { low: { summary: "Builder", goals: null, offers: null, desiredConnections: null, background: null }, high: null },
    restrictions: [{ guestId: lowId, otherGuest: guestRow("x", "Cy"), reason: "Past dispute" }],
    earlier: [{ row: row({ id: "66666666-6666-4666-8666-666666666666" }), guestId: highId, otherGuest: null }],
  });
  assert.doesNotMatch(JSON.stringify([summary, detail]), /secret@example|\+6590000000/);
  assert.equal(detail.revocationReason, "pair_blocked");
  assert.equal(detail.guests[1].profile, null);
  assert.equal(detail.restrictions[0].otherGuestName, "Cy Guest");
  assert.equal(detail.earlierIntroductions[0].otherGuestName, "Unknown guest");
});

function service(role, overrides = {}) {
  const calls = [];
  const dependencies = {
    findOrganizationId: async () => organizationId,
    requireCreator: (args) => requireEventCreator(args, { findMembership: async () => (role ? { active: role !== "inactive-owner", role: role === "inactive-owner" ? "owner" : role, organizationName: "Org" } : null) }),
    sync: async (args) => { calls.push(["sync", args]); return { state: "synced" }; },
    listMatches: async (id, status) => { calls.push(["list", id, status]); return { rows: [row()], guests: new Map([[lowId, guestRow(lowId, "Ada")], [highId, guestRow(highId, "Bea")]]), counts: { active: 1, revoked: 0 } }; },
    findMatch: async (id, mid) => { calls.push(["find", id, mid]); return mid === matchId ? { match: row(), guests: new Map([[lowId, guestRow(lowId, "Ada")], [highId, guestRow(highId, "Bea")]]), restrictions: [], earlier: [] } : null; },
    findProfile: async () => null,
    ...overrides,
  };
  return { dependencies, calls };
}

test("only active Owners and Organizers can list or open matches; others cause no sync or read", async () => {
  for (const role of ["owner", "organizer"]) {
    const { dependencies, calls } = service(role);
    const list = await listMatches({ userId: actor.id, eventId, status: "active" }, dependencies);
    assert.equal(list.matches.length, 1);
    assert.deepEqual(calls[0], ["sync", { organizationId, eventId }]);
    assert.deepEqual(calls[1], ["list", eventId, "active"]);
    assert.equal((await getMatch({ userId: actor.id, eventId, matchId }, dependencies)).id, matchId);
  }
  for (const role of ["staff", "sponsor", "inactive-owner", null]) {
    const { dependencies, calls } = service(role);
    await assert.rejects(() => listMatches({ userId: actor.id, eventId }, dependencies), { code: "FORBIDDEN" });
    await assert.rejects(() => getMatch({ userId: actor.id, eventId, matchId }, dependencies), { code: "FORBIDDEN" });
    assert.deepEqual(calls, [], `nothing is synced or read for ${role}`);
  }
  const missing = service("owner", { findOrganizationId: async () => null });
  await assert.rejects(() => listMatches({ userId: actor.id, eventId }, missing.dependencies), { code: "NOT_FOUND" });
  await assert.rejects(() => getMatch({ userId: actor.id, eventId, matchId: "66666666-6666-4666-8666-666666666666" }, service("owner").dependencies), { code: "NOT_FOUND" });
  await assert.rejects(() => getMatch({ userId: actor.id, eventId, matchId: "bad" }, service("owner").dependencies), { code: "NOT_FOUND" });
});

test("an unreachable engine still lists stored matches with a sync note", async () => {
  const { dependencies } = service("owner", { sync: async () => ({ state: "unavailable", reason: "unreachable" }) });
  const list = await listMatches({ userId: actor.id, eventId }, dependencies);
  assert.equal(list.matches.length, 1);
  assert.deepEqual(list.sync, { state: "unavailable", reason: "unreachable" });
});

test("handlers return 401, 400 and 422 before reaching the service and mark responses private", async () => {
  let called = false;
  const deps = (overrides) => ({ getCurrentUser: async () => actor, listMatches: async () => { called = true; return { matches: [], counts: { active: 0, revoked: 0 }, sync: { state: "synced" } }; }, getMatch: async () => { called = true; throw new Error("unused"); }, ...overrides });
  const list = (id = eventId, query = "", d = deps()) => handleListMatches(new Request(`https://weft.example/api/events/${id}/matches${query}`), id, d);
  assert.equal((await list(eventId, "", deps({ getCurrentUser: async () => null }))).status, 401);
  assert.equal((await list("bad")).status, 400);
  assert.equal((await list(eventId, "?status=accepted")).status, 422);
  assert.equal(called, false);
  const ok = await list(eventId, "?status=revoked");
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await handleGetMatch(new Request("https://weft.example"), eventId, "bad", deps())).status, 400);
  assert.equal((await handleGetMatch(new Request("https://weft.example"), eventId, matchId, deps({ getCurrentUser: async () => null }))).status, 401);
});

test("copy never claims acceptance or a meeting and maps every reason", () => {
  const all = [MATCHES_SUBTITLE, ...Object.values(revocationReasonCopy), ...Object.values(introductionPathLabels), emptyMatchesCopy("all", 0).description, describeSync({ state: "unavailable", reason: "unreachable" })].join(" ");
  assert.doesNotMatch(all, /accepted|agreed|confirmed|scheduled|booked/i);
  assert.equal(Object.keys(revocationReasonCopy).length, 4);
  assert.equal(describeSync({ state: "synced" }), null);
  assert.match(emptyMatchesCopy("revoked", 3).title, /revoked/i);
});

test("the list and detail render pairs, statuses, reasons and states without contact details", () => {
  const low = guestRow(lowId, "Ada"); const high = guestRow(highId, "Bea");
  const list = { matches: [toMatchSummary(row(), low, high), toMatchSummary(row({ id: "66666666-6666-4666-8666-666666666666", status: "revoked", revokedAt: now, revocationReason: "guest_excluded" }), low, high)], counts: { active: 1, revoked: 1 }, sync: { state: "unavailable", reason: "unreachable" } };
  const html = renderToStaticMarkup(React.createElement(MatchesList, { list, filter: "all", onFilter() {}, onOpen() {}, onRetry() {} }));
  assert.match(html, /Ada Guest/); assert.match(html, /Message coordination/); assert.match(html, /Revoked/);
  assert.match(html, /A guest was excluded from networking/); assert.match(html, /may be out of date/);
  assert.match(html, /aria-label="View match details for Ada Guest and Bea Guest"/);
  assert.doesNotMatch(html, /secret@example|accept/i);
  const revokedOnly = renderToStaticMarkup(React.createElement(MatchesList, { list: { ...list, matches: [list.matches[0]], counts: { active: 1, revoked: 0 } }, filter: "revoked", onFilter() {}, onOpen() {}, onRetry() {} }));
  assert.match(revokedOnly, /No revoked matches/);
  const empty = renderToStaticMarkup(React.createElement(MatchesList, { list: { matches: [], counts: { active: 0, revoked: 0 }, sync: { state: "synced" } }, filter: "all", onFilter() {}, onOpen() {}, onRetry() {} }));
  assert.match(empty, /No matches yet/);
  const detail = toMatchDetail({ row: row({ status: "revoked", revokedAt: now, revocationReason: "pair_blocked" }), low, high, profiles: { low: { summary: "Builder", goals: "Raise seed", offers: null, desiredConnections: null, background: null }, high: null }, restrictions: [], earlier: [] });
  const detailHtml = renderToStaticMarkup(React.createElement(MatchDetailView, { match: detail }));
  for (const text of ["Raise seed", "Stage is unclear", "Funding stage", "This pair is marked do not match", "no guest has been asked", "Looking for seed investors", "Matching run"]) assert.match(detailHtml, new RegExp(text));
  const panel = renderToStaticMarkup(React.createElement(MatchesPanelView, { body: "x", summary: "1 active · 1 revoked" }));
  assert.match(panel, /<h2[^>]*>Matches<\/h2>/);
});

test("the matches tab is a valid event detail tab", () => {
  assert.equal(getEventDetailTab("matches"), "matches");
  assert.equal(getEventDetailTab("nonsense"), "overview");
});

test("the status service syncs matches for a finished run only when the engine answered", async () => {
  const { getMatchingStatus } = loadTs("src/modules/network/server/matching-status-service.ts");
  const status = (lastFinishedRunId) => ({ availability: "available", status: { state: "finished", pendingChanges: 0, latestRun: null, lastFinishedRunId, nextAttemptAt: null, automaticEnabled: true } });
  const synced = [];
  const base = {
    findOrganizationId: async () => organizationId,
    requireCreator: async () => ({ id: organizationId, name: "Org" }),
    syncFinishedRun: async (args) => { synced.push(args); },
  };
  await getMatchingStatus({ userId: actor.id, eventId }, { ...base, readStatus: async () => status(runId) });
  assert.deepEqual(synced, [{ organizationId, eventId, runId }]);
  await getMatchingStatus({ userId: actor.id, eventId }, { ...base, readStatus: async () => status(null) });
  await getMatchingStatus({ userId: actor.id, eventId }, { ...base, readStatus: async () => ({ availability: "unavailable", reason: "unreachable" }) });
  assert.equal(synced.length, 1);
});
