import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { drizzle } from "drizzle-orm/pg-proxy";
import { loadTs, stubTs } from "./load-ts.mjs";

const eventId = "22222222-2222-4222-8222-222222222222";
const statements = [];
const database = drizzle(async (query, params) => {
  statements.push({ query, params });
  if (query.includes("group by")) return { rows: [["active", 1050], ["revoked", 20]] };
  if (query.includes("count(*)")) return { rows: [[1030]] };
  return { rows: [] };
});
stubTs("src/infrastructure/database/client.ts", { getDatabase: () => database });
const { listEventMatches } = loadTs("src/modules/network/server/match-repository.ts");
const { matchListQuerySchema } = loadTs("src/modules/network/matches-schemas.ts");
const { eventMatchesKey, fetchEventMatches } = loadTs("src/modules/network/queries/matches.ts");
const { MatchesList } = loadTs("src/modules/network/components/matches-panel.tsx");

const controls = { filter: "active", search: "", introductionPath: "all", onSearch() {}, onFilter() {}, onIntroductionPath() {}, onPage() {}, onOpen() {} };
const list = { matches: [], counts: { active: 1050, revoked: 20 }, pagination: { page: 1, pageSize: 25, total: 0 }, sync: { state: "synced" } };

test("match browsing validates filters and bounded page input", () => {
  assert.deepEqual(matchListQuerySchema.parse({}), { search: "", page: 1, locale: "en" });
  assert.deepEqual(matchListQuerySchema.parse({ search: "  Ada Guest  ", page: "42", status: "active", introductionPath: "wefter", locale: "es" }), { search: "Ada Guest", page: 42, status: "active", introductionPath: "wefter", locale: "es" });
  for (const value of [{ page: 0 }, { page: 1.5 }, { page: "oops" }, { page: 1000001 }, { search: "x".repeat(201) }, { introductionPath: "assigned" }, { status: "accepted" }]) {
    assert.equal(matchListQuerySchema.safeParse(value).success, false);
  }
});

test("the repository pages beyond 1000, binds literal search and scopes both attendees to the event", async () => {
  statements.length = 0;
  const result = await listEventMatches(eventId, { status: "active", search: "Ada %_ Guest", introductionPath: "wefter", page: 41 });
  assert.deepEqual(result.pagination, { page: 41, pageSize: 25, total: 1030 });
  assert.deepEqual(result.counts, { active: 1050, revoked: 20 });
  const counts = statements[0];
  assert.deepEqual(counts.params, [eventId], "status counts remain global to this event");
  const filtered = statements[1];
  const rows = statements[2];
  for (const statement of [filtered, rows]) {
    assert.match(statement.query, /"event_matches"\."event_id" = \$1/);
    assert.match(statement.query, /"event_guests"\."event_id" = "event_matches"\."event_id"/);
    assert.match(statement.query, /"event_guests"\."id" = "event_matches"\."guest_low_id" or "event_guests"\."id" = "event_matches"\."guest_high_id"/);
    assert.match(statement.query, /strpos\(lower\(concat_ws/);
    assert.deepEqual(statement.params.slice(0, 4), [eventId, "active", "wefter", "Ada %_ Guest"]);
    assert.doesNotMatch(statement.query, /Ada %_/);
  }
  assert.match(rows.query, /order by "event_matches"\."created_at" desc, "event_matches"\."id" desc limit \$5 offset \$6/);
  assert.deepEqual(rows.params.slice(-2), [25, 1000]);
  const clamped = await listEventMatches(eventId, { page: 999 });
  assert.equal(clamped.pagination.page, 42, "polling or revoked matches cannot leave an out-of-range page");
  assert.deepEqual(statements.at(-1).params.slice(-2), [25, 1025]);
});

test("the client sends and caches each search/filter/page combination independently", async () => {
  const options = { status: "active", search: "Mina & Co", introductionPath: "wefter", page: 42 };
  let requested;
  const result = await fetchEventMatches(eventId, async (url, init) => {
    requested = new URL(url, "https://weft.example");
    assert.equal(init.cache, "no-store");
    return Response.json({ data: list });
  }, options);
  assert.deepEqual(result.pagination, list.pagination);
  assert.equal(requested.searchParams.get("search"), "Mina & Co");
  assert.equal(requested.searchParams.get("page"), "42");
  assert.equal(requested.searchParams.get("introductionPath"), "wefter");
  assert.notDeepEqual(eventMatchesKey(eventId, options), eventMatchesKey(eventId, { ...options, page: 1 }));
  assert.notDeepEqual(eventMatchesKey(eventId, options), eventMatchesKey("other-event", options));
});

test("empty search results preserve controls and show a useful empty state", () => {
  const html = renderToStaticMarkup(React.createElement(MatchesList, { ...controls, list, search: "Nobody" }));
  assert.match(html, /No matches found/);
  assert.match(html, /Search matches by attendee or company/);
  assert.match(html, /value="Nobody"/);
  assert.match(html, /0 matches/);
  assert.match(html, /disabled=""[^>]*>Next/);
});

test("compact rows separate the two attendees, hide redundant active status and retain paging", () => {
  const match = { id: "match", status: "active", guests: [{ name: "Ada Guest", company: "A Company", jobPosition: "Partner" }, { name: "Bea Guest", company: "B Company", jobPosition: "Founder" }], reasonPreview: "A specific reason", introductionPath: "wefter" };
  const html = renderToStaticMarkup(React.createElement(MatchesList, { ...controls, list: { ...list, matches: [match], pagination: { page: 41, pageSize: 25, total: 1030 } } }));
  assert.match(html, /<td[^>]*data-label="Attendee"[^>]*>.*Ada Guest.*<\/td><td[^>]*data-label="Matched with"[^>]*>.*Bea Guest/);
  assert.doesNotMatch(html, /<th scope="col">Status/);
  assert.doesNotMatch(html, /Partner|Founder/);
  assert.match(html, /1,001–1,025 of 1,030 matches/);
  assert.match(html, /Page 41 of 42/);
  assert.match(html, /aria-haspopup="dialog"/);
  const mixed = renderToStaticMarkup(React.createElement(MatchesList, { ...controls, filter: "all", list: { ...list, matches: [match] } }));
  assert.match(mixed, /<th scope="col">Status/);
});
