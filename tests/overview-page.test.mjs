import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";
import { stubI18n } from "./i18n-stub.mjs";

stubI18n();

stubTs("@/shared/ui/console-account", { ConsoleAccount: () => null });
const context = {
  user: { id: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f", displayName: "Ada", avatarUrl: null },
  organization: { id: "0b0d7f7c-1e0c-4a39-9a1e-8f2b5e4f4c11", name: "Analytical Engines" },
  membership: { id: "membership-1", role: "organizer" },
};
const render = (events, outcomes) => {
  const { OrganizerOverview } = loadTs("src/modules/insights/components/organizer-overview.tsx");
  return renderToStaticMarkup(React.createElement(OrganizerOverview, { context, events, outcomes }));
};
const event = (id, city, status, startsAt, guestCount) => ({
  id, name: `Event ${id}`, city, venue: "", startDate: startsAt.slice(0, 10), endDate: startsAt.slice(0, 10),
  startsAt, endsAt: startsAt, timezone: "UTC", guestCount, coverImage: null, status,
});

const sampleEvents = [
  event("11111111-1111-4111-8111-111111111111", "Singapore", "upcoming", "2099-01-01T00:00:00.000Z", 10),
  event("22222222-2222-4222-8222-222222222222", "Davos", "completed", "2026-01-01T00:00:00.000Z", 5),
];

test("no events: only the hero and the create-event empty state", () => {
  const html = render([]);
  assert.match(html, /No events yet/);
  assert.match(html, /Create your first event to start measuring networking outcomes\./);
  assert.doesNotMatch(html, /metric__value|Event performance|Outcomes tracking/);
});

test("metrics and tables come from events; untracked outcomes show an honest empty state with link to /outcomes", () => {
  const html = render(sampleEvents, {
    status: "ready",
    report: {
      eventOptions: [
        { eventId: sampleEvents[0].id, eventName: sampleEvents[0].name },
        { eventId: sampleEvents[1].id, eventName: sampleEvents[1].name },
      ],
      events: [
        { eventId: sampleEvents[0].id, eventName: sampleEvents[0].name, startsAt: sampleEvents[0].startsAt, timezone: "UTC", trackingStartedAt: null, completedIntroductions: 0, peopleIntroduced: 0 },
        { eventId: sampleEvents[1].id, eventName: sampleEvents[1].name, startsAt: sampleEvents[1].startsAt, timezone: "UTC", trackingStartedAt: null, completedIntroductions: 0, peopleIntroduced: 0 },
      ],
      totals: { completedIntroductions: 0, trackedEvents: 0, totalEvents: 2 },
      selectedEventId: null,
    },
  });
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Events<\/div>/);
  assert.match(html, /<div class="metric__value">15<\/div><div class="metric__label">Guests<\/div>/);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Cities<\/div>/);
  assert.match(html, /Outcomes tracking hasn’t started yet/);
  assert.match(html, /confirmed meetings recorded after tracking starts/);
  assert.match(html, /href="\/outcomes"/);
  assert.match(html, /href="\/events\/11111111-1111-4111-8111-111111111111"/);
  assert.doesNotMatch(html, /1,840|Miami|WE ARE ONE|map\.png|Move<br\/>Together/);
});

test("tracked outcomes with partial coverage show aggregate completed introductions without summing people", () => {
  const html = render(sampleEvents, {
    status: "ready",
    report: {
      eventOptions: [
        { eventId: sampleEvents[0].id, eventName: sampleEvents[0].name },
        { eventId: sampleEvents[1].id, eventName: sampleEvents[1].name },
      ],
      events: [
        { eventId: sampleEvents[0].id, eventName: sampleEvents[0].name, startsAt: sampleEvents[0].startsAt, timezone: "UTC", trackingStartedAt: "2026-01-01T10:00:00.000Z", completedIntroductions: 12, peopleIntroduced: 9 },
        { eventId: sampleEvents[1].id, eventName: sampleEvents[1].name, startsAt: sampleEvents[1].startsAt, timezone: "UTC", trackingStartedAt: null, completedIntroductions: 0, peopleIntroduced: 0 },
      ],
      totals: { completedIntroductions: 12, trackedEvents: 1, totalEvents: 2 },
      selectedEventId: null,
    },
  });
  assert.match(html, /<strong class="outcomes-overview-stat__value">12<\/strong>/);
  assert.match(html, /Completed introductions/);
  assert.match(html, /1 of 2/);
  assert.match(html, /Partial coverage/);
  assert.match(html, /View outcomes report/);
  assert.doesNotMatch(html, /People introduced/);
});

test("tracked zero outcomes show 0 completed introductions and active tracking note", () => {
  const html = render(sampleEvents, {
    status: "ready",
    report: {
      eventOptions: [{ eventId: sampleEvents[0].id, eventName: sampleEvents[0].name }],
      events: [
        { eventId: sampleEvents[0].id, eventName: sampleEvents[0].name, startsAt: sampleEvents[0].startsAt, timezone: "UTC", trackingStartedAt: "2026-01-01T10:00:00.000Z", completedIntroductions: 0, peopleIntroduced: 0 },
      ],
      totals: { completedIntroductions: 0, trackedEvents: 1, totalEvents: 1 },
      selectedEventId: null,
    },
  });
  assert.match(html, /<strong class="outcomes-overview-stat__value">0<\/strong>/);
  assert.match(html, /Tracking is active/);
});

test("outcomes load failure renders an unavailable outcomes panel while keeping the event overview intact", () => {
  const html = render(sampleEvents, { status: "error" });
  assert.match(html, /Outcomes unavailable/);
  assert.match(html, /Your event overview is still available\./);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Events<\/div>/);
  assert.match(html, /<div class="metric__value">15<\/div><div class="metric__label">Guests<\/div>/);
  assert.match(html, /Your events/);
  assert.match(html, /Upcoming events/);
  assert.match(html, /href="\/events\/11111111-1111-4111-8111-111111111111"/);
});
