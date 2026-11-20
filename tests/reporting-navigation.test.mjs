import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { event as detailEventFixture } from "./event-detail-fixture.mjs";
import { stubI18n } from "./i18n-stub.mjs";
import { loadTs, stubTs } from "./load-ts.mjs";

const { parseReportQuery, reportsHref } = loadTs("src/modules/insights/reporting-navigation.ts");
const id = "1f50ef3c-7bb0-4ee8-94f5-3c1764ec9d35";

test("report links preserve event scope and reject ambiguous event identifiers", () => {
  assert.equal(reportsHref(), "/outcomes/reports");
  assert.equal(reportsHref(id), `/outcomes/reports?eventId=${id}`);
  assert.equal(parseReportQuery({ eventId: [id, id] }), null);
  assert.equal(parseReportQuery({ eventId: "organization-id" }), null);
  assert.equal(parseReportQuery({ eventId: id.toUpperCase() }).eventId, id);
});

test("report parameters are constrained to their supported views and time windows", () => {
  const series = parseReportQuery({ view: "across", report: "series", metric: "follow-through", window: "30", series: "forum", from: "2026-02-30", to: "2026-12-30", eventId: id });
  assert.deepEqual(series, {
    view: "across", report: "series", metric: "follow-through", window: 30, series: "forum", to: "2026-12-30",
    from: undefined, eventId: id, sponsor: undefined, segment: undefined, detail: undefined,
  });
  const invalid = parseReportQuery({ view: "event", report: "sponsor-outcomes", sponsor: "sponsor-key", detail: "public", window: ["7", "30"] });
  assert.equal(invalid.report, undefined);
  assert.equal(invalid.sponsor, undefined);
  assert.equal(invalid.detail, undefined);
  assert.equal(invalid.window, 7);
});

test("Event Insights opens the new report in the current event for organizers", () => {
  stubI18n();
  stubTs("@/modules/network/components/matches-panel", { MatchesPanel: () => null });
  stubTs("@/modules/network/components/matching-status-panel", { MatchingStatusPanel: () => null });
  stubTs("@/modules/events/components/attendee-roster", { AttendeeRoster: () => null });
  stubTs("@/modules/events/components/kami-workspace", { KamiWorkspace: () => null });
  stubTs("@/modules/events/components/event-language-panel", { EventLanguagePanel: () => null });
  stubTs("@/modules/events/components/event-settings-panel", { EventSettingsPanel: () => null });
  stubTs("@/modules/events/components/event-wefters-panel", { EventWeftersPanel: () => null });
  const { EventDetailPage } = loadTs("src/modules/events/components/event-detail-page.tsx");
  const render = (canManage) => renderToStaticMarkup(React.createElement(EventDetailPage, {
    event: { ...detailEventFixture, attendees: { ...detailEventFixture.attendees, canManage } },
    initialTab: "insights",
    onRosterChanged: async () => {},
  }));
  const href = reportsHref(detailEventFixture.id);
  assert.ok(render(true).includes(`href="${href}"`));
  assert.ok(!render(false).includes(href));
});
