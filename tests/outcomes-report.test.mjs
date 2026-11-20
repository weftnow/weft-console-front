import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";
import { event as detailEventFixture } from "./event-detail-fixture.mjs";

const { createI18n } = loadTs("src/shared/i18n/i18n.ts");
const { en } = loadTs("src/shared/i18n/dictionaries/en.ts");
const { es } = loadTs("src/shared/i18n/dictionaries/es.ts");
let activeI18n = createI18n("en", en);
stubTs("@/shared/i18n/I18nProvider", {
  useI18n: () => activeI18n,
  I18nProvider: ({ children }) => children,
});

const EVENT_A = "11111111-1111-4111-8111-111111111111";
const EVENT_B = "22222222-2222-4222-8222-222222222222";
const noopAction = async () => {};

const renderReport = (report, startTrackingAction = noopAction) => {
  const { OutcomesReportPage } = loadTs("src/modules/insights/components/outcomes-report-page.tsx");
  return renderToStaticMarkup(
    React.createElement(OutcomesReportPage, {
      organizationName: "Analytical Engines",
      report,
      startTrackingAction,
    }),
  );
};

test("parseOutcomesEventId accepts absent/empty as all, valid UUID as event, and rejects malformed or multi-valued inputs", () => {
  const { parseOutcomesEventId, outcomesHref } = loadTs("src/modules/insights/outcomes-navigation.ts");
  assert.deepEqual(parseOutcomesEventId(undefined), { kind: "all" });
  assert.deepEqual(parseOutcomesEventId(""), { kind: "all" });
  assert.deepEqual(parseOutcomesEventId("   "), { kind: "all" });
  assert.deepEqual(parseOutcomesEventId(EVENT_A), { kind: "event", eventId: EVENT_A });
  const uppercase = "AAAAAAAA-1111-4111-8111-111111111111";
  assert.deepEqual(parseOutcomesEventId(uppercase), { kind: "event", eventId: uppercase.toLowerCase() });
  assert.deepEqual(parseOutcomesEventId("not-a-uuid"), { kind: "invalid" });
  assert.deepEqual(parseOutcomesEventId([EVENT_A, EVENT_B]), { kind: "invalid" });
  assert.equal(outcomesHref(null), "/outcomes");
  assert.equal(outcomesHref(EVENT_A), `/outcomes?eventId=${EVENT_A}`);
});

test("no events report renders an empty state with a create event action", () => {
  const html = renderReport({
    eventOptions: [],
    events: [],
    totals: { completedIntroductions: 0, trackedEvents: 0, totalEvents: 0 },
    selectedEventId: null,
  });
  assert.match(html, /No events yet/);
  assert.match(html, /href="\/events\/new"/);
  assert.doesNotMatch(html, /<table|Start tracking/);
});

test("all-events untracked report shows unavailable state without misleading 0 total or start-tracking forms", () => {
  const html = renderReport({
    eventOptions: [
      { eventId: EVENT_A, eventName: "Davos Summit" },
      { eventId: EVENT_B, eventName: "Singapore Forum" },
    ],
    events: [
      {
        eventId: EVENT_A,
        eventName: "Davos Summit",
        startsAt: "2026-01-20T09:00:00.000Z",
        timezone: "Europe/Zurich",
        trackingStartedAt: null,
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
      {
        eventId: EVENT_B,
        eventName: "Singapore Forum",
        startsAt: "2026-03-10T09:00:00.000Z",
        timezone: "Asia/Singapore",
        trackingStartedAt: null,
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
    ],
    totals: { completedIntroductions: 0, trackedEvents: 0, totalEvents: 2 },
    selectedEventId: null,
  });
  assert.match(html, /All events · Analytical Engines/);
  assert.match(html, /Outcomes tracking hasn’t started yet/);
  assert.match(html, /confirmed meetings recorded after tracking starts/);
  assert.match(html, /Not tracked/);
  assert.match(html, new RegExp(`href="/outcomes\\?eventId=${EVENT_A}"`));
  assert.match(html, new RegExp(`href="/outcomes\\?eventId=${EVENT_B}"`));
  assert.doesNotMatch(html, /Start tracking|name="eventId" type="hidden"|metric__value/);
});

test("all-events partial coverage shows aggregate completed introductions, per-event people without total, and links to filter rows", () => {
  const html = renderReport({
    eventOptions: [
      { eventId: EVENT_A, eventName: "Davos Summit" },
      { eventId: EVENT_B, eventName: "Singapore Forum" },
    ],
    events: [
      {
        eventId: EVENT_A,
        eventName: "Davos Summit",
        startsAt: "2026-01-20T09:00:00.000Z",
        timezone: "Europe/Zurich",
        trackingStartedAt: "2026-01-19T12:00:00.000Z",
        completedIntroductions: 14,
        peopleIntroduced: 11,
      },
      {
        eventId: EVENT_B,
        eventName: "Singapore Forum",
        startsAt: "2026-03-10T09:00:00.000Z",
        timezone: "Asia/Singapore",
        trackingStartedAt: null,
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
    ],
    totals: { completedIntroductions: 14, trackedEvents: 1, totalEvents: 2 },
    selectedEventId: null,
  });
  assert.match(html, /<div class="metric__value">14<\/div><div class="metric__label">Completed introductions<\/div>/);
  assert.match(html, /<div class="metric__value">1 of 2<\/div><div class="metric__label">Tracked events<\/div>/);
  assert.match(html, /Partial coverage/);
  assert.match(html, /deduplicated within each event and is not summed across events/);
  // People introduced appears in the table column header, NOT in the top summary metric cards.
  const summarySection = html.match(/<section aria-label="Outcomes summary"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.doesNotMatch(summarySection, /People introduced/);
  assert.match(html, /<th class="cell-number" scope="col">People introduced<\/th>/);
  assert.match(html, /data-label="People introduced" role="cell">11<\/td>/);
  assert.match(html, /data-label="People introduced" role="cell"><span aria-label="Not tracked" class="table-empty">—<\/span><\/td>/);
  assert.doesNotMatch(html, /Start tracking/);
});

test("all-events tracked zero renders 0 completed introductions and active zero state", () => {
  const html = renderReport({
    eventOptions: [{ eventId: EVENT_A, eventName: "Davos Summit" }],
    events: [
      {
        eventId: EVENT_A,
        eventName: "Davos Summit",
        startsAt: "2026-01-20T09:00:00.000Z",
        timezone: "Europe/Zurich",
        trackingStartedAt: "2026-01-19T12:00:00.000Z",
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
    ],
    totals: { completedIntroductions: 0, trackedEvents: 1, totalEvents: 1 },
    selectedEventId: null,
  });
  assert.match(html, /<div class="metric__value">0<\/div><div class="metric__label">Completed introductions<\/div>/);
  assert.match(html, /No completed introductions yet/);
  assert.match(html, /All events are tracking outcomes\./);
});

test("single-event untracked report renders a Start tracking form submitting eventId", () => {
  const html = renderReport({
    eventOptions: [
      { eventId: EVENT_A, eventName: "Davos Summit" },
      { eventId: EVENT_B, eventName: "Singapore Forum" },
    ],
    events: [
      {
        eventId: EVENT_B,
        eventName: "Singapore Forum",
        startsAt: "2026-03-10T09:00:00.000Z",
        timezone: "Asia/Singapore",
        trackingStartedAt: null,
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
    ],
    totals: { completedIntroductions: 0, trackedEvents: 0, totalEvents: 1 },
    selectedEventId: EVENT_B,
  });
  assert.match(html, /Single event · Singapore Forum/);
  assert.match(html, /Outcomes tracking hasn’t started for this event/);
  assert.match(html, /Start tracking/);
  assert.match(html, new RegExp(`type="hidden"[^>]*name="eventId"[^>]*value="${EVENT_B}"|name="eventId"[^>]*type="hidden"[^>]*value="${EVENT_B}"`));
  assert.match(html, /href="\/outcomes"/);
  assert.match(html, new RegExp(`href="/events/${EVENT_B}"`));
});

test("single-event tracked zero report shows 0 introductions, 0 unique people, tracking start date, and no Start tracking form", () => {
  const html = renderReport({
    eventOptions: [{ eventId: EVENT_A, eventName: "Davos Summit" }],
    events: [
      {
        eventId: EVENT_A,
        eventName: "Davos Summit",
        startsAt: "2026-01-20T09:00:00.000Z",
        timezone: "Europe/Zurich",
        trackingStartedAt: "2026-01-19T12:00:00.000Z",
        completedIntroductions: 0,
        peopleIntroduced: 0,
      },
    ],
    totals: { completedIntroductions: 0, trackedEvents: 1, totalEvents: 1 },
    selectedEventId: EVENT_A,
  });
  assert.match(html, /<div class="metric__value">0<\/div><div class="metric__label">Completed introductions<\/div>/);
  assert.match(html, /<div class="metric__value">0<\/div><div class="metric__label">People introduced<\/div>/);
  assert.match(html, /Tracking since/);
  assert.match(html, /No completed introductions yet/);
  assert.doesNotMatch(html, /Start tracking/);
});

test("single-event tracked report with outcomes shows event totals and links to Event Detail", () => {
  const html = renderReport({
    eventOptions: [{ eventId: EVENT_A, eventName: "Davos Summit" }],
    events: [
      {
        eventId: EVENT_A,
        eventName: "Davos Summit",
        startsAt: "2026-01-20T09:00:00.000Z",
        timezone: "Europe/Zurich",
        trackingStartedAt: "2026-01-19T12:00:00.000Z",
        completedIntroductions: 18,
        peopleIntroduced: 15,
      },
    ],
    totals: { completedIntroductions: 18, trackedEvents: 1, totalEvents: 1 },
    selectedEventId: EVENT_A,
  });
  assert.match(html, /<div class="metric__value">18<\/div><div class="metric__label">Completed introductions<\/div>/);
  assert.match(html, /<div class="metric__value">15<\/div><div class="metric__label">People introduced<\/div>/);
  assert.match(html, new RegExp(`href="/events/${EVENT_A}"`));
  assert.doesNotMatch(html, /Start tracking|No completed introductions yet/);
});

test("outcomes loading, error, and not-found route states render cleanly", () => {
  const Loading = loadTs("src/app/outcomes/loading.tsx").default;
  const ErrorPage = loadTs("src/app/outcomes/error.tsx").default;
  const NotFound = loadTs("src/app/outcomes/not-found.tsx").default;

  const loadingHtml = renderToStaticMarkup(React.createElement(Loading));
  assert.match(loadingHtml, /aria-busy="true"/);
  assert.match(loadingHtml, /aria-label="Loading outcomes report"/);

  const errorHtml = renderToStaticMarkup(React.createElement(ErrorPage, { error: new Error("db"), retry: () => {}, reset: () => {} }));
  assert.match(errorHtml, /Outcomes unavailable/);
  assert.match(errorHtml, /<button[^>]*>Try again<\/button>/);

  const notFoundHtml = renderToStaticMarkup(React.createElement(NotFound));
  assert.match(notFoundHtml, /Event outcomes not found/);
  assert.match(notFoundHtml, /This event outcomes report is unavailable\./);
  assert.match(notFoundHtml, /href="\/outcomes"/);
});

test("Event Detail Insights entries link to filtered /outcomes only for owners and organizers", () => {
  stubTs("@/modules/network/components/matches-panel", { MatchesPanel: () => null });
  stubTs("@/modules/network/components/matching-status-panel", { MatchingStatusPanel: () => null });
  stubTs("@/modules/events/components/attendee-roster", { AttendeeRoster: () => null });
  stubTs("@/modules/events/components/kami-workspace", { KamiWorkspace: () => null });
  stubTs("@/modules/events/components/event-language-panel", { EventLanguagePanel: () => null });
  stubTs("@/modules/events/components/event-settings-panel", { EventSettingsPanel: () => null });
  stubTs("@/modules/events/components/event-wefters-panel", { EventWeftersPanel: () => null });

  const { EventDetailPage } = loadTs("src/modules/events/components/event-detail-page.tsx");
  const organizerEvent = { ...detailEventFixture, attendees: { ...detailEventFixture.attendees, canManage: true } };
  const staffEvent = { ...detailEventFixture, attendees: { ...detailEventFixture.attendees, canManage: false } };

  const organizerHtml = renderToStaticMarkup(
    React.createElement(EventDetailPage, { event: organizerEvent, initialTab: "overview", onRosterChanged: async () => {} }),
  );
  const expectedOutcomesHref = `/outcomes?eventId=${detailEventFixture.id}`;
  assert.ok(organizerHtml.includes(`href="${expectedOutcomesHref}"`), "organizer Event Detail should link Insights to /outcomes?eventId=...");

  const organizerInsightsTabHtml = renderToStaticMarkup(
    React.createElement(EventDetailPage, { event: organizerEvent, initialTab: "insights", onRosterChanged: async () => {} }),
  );
  assert.match(organizerInsightsTabHtml, /Open outcomes report/);
  assert.ok(organizerInsightsTabHtml.includes(`href="${expectedOutcomesHref}"`));

  const staffHtml = renderToStaticMarkup(
    React.createElement(EventDetailPage, { event: staffEvent, initialTab: "overview", onRosterChanged: async () => {} }),
  );
  assert.ok(!staffHtml.includes(expectedOutcomesHref), "staff Event Detail must not link to organizer /outcomes");
});

test("outcomes route and overview route wire authorization, searchParams, safe notFound, and isolated overview failure", () => {
  const outcomesRoute = readFileSync("src/app/outcomes/page.tsx", "utf8");
  assert.match(outcomesRoute, /requireOrganizerPageContext\(\)/);
  assert.match(outcomesRoute, /await searchParams/);
  assert.match(outcomesRoute, /parseOutcomesEventId\(/);
  assert.match(outcomesRoute, /notFound\(\)/);
  assert.match(outcomesRoute, /code === "NOT_FOUND"/);
  assert.match(outcomesRoute, /from "@\/modules\/insights\/server\/outcomes-service"/);
  assert.match(outcomesRoute, /from "@\/modules\/insights\/outcomes-report"/);
  assert.match(outcomesRoute, /from "@\/app\/outcomes-actions"/);

  const overviewRoute = readFileSync("src/app/page.tsx", "utf8");
  assert.match(overviewRoute, /requireOrganizerPageContext\(\)/);
  assert.match(overviewRoute, /from "@\/modules\/insights\/server\/outcomes-service"/);
  assert.match(overviewRoute, /\.catch\(/);
});

test("outcomes report renders translated Spanish copy when Spanish locale is active", () => {
  activeI18n = createI18n("es", es);
  try {
    const html = renderReport({
      eventOptions: [{ eventId: EVENT_A, eventName: "Cumbre Bogotá" }],
      events: [
        {
          eventId: EVENT_A,
          eventName: "Cumbre Bogotá",
          startsAt: "2026-06-15T14:00:00.000Z",
          timezone: "America/Bogota",
          trackingStartedAt: null,
          completedIntroductions: 0,
          peopleIntroduced: 0,
        },
      ],
      totals: { completedIntroductions: 0, trackedEvents: 0, totalEvents: 1 },
      selectedEventId: EVENT_A,
    });
    assert.match(html, /Resultados de networking/);
    assert.match(html, /Iniciar seguimiento/);
    assert.match(html, /Sin seguimiento/);
  } finally {
    activeI18n = createI18n("en", en);
  }
});
