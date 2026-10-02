import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";

stubTs("@/shared/ui/console-account", { ConsoleAccount: () => null });
const context = {
  user: { id: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f", displayName: "Ada", avatarUrl: null },
  organization: { id: "0b0d7f7c-1e0c-4a39-9a1e-8f2b5e4f4c11", name: "Analytical Engines" },
  membership: { id: "membership-1", role: "organizer" },
};
const render = (events) => {
  const { OrganizerOverview } = loadTs("src/modules/insights/components/organizer-overview.tsx");
  return renderToStaticMarkup(React.createElement(OrganizerOverview, { context, events }));
};
const event = (id, city, status, startsAt, guestCount) => ({
  id, name: `Event ${id}`, city, venue: "", startDate: startsAt.slice(0, 10), endDate: startsAt.slice(0, 10),
  startsAt, endsAt: startsAt, timezone: "UTC", guestCount, coverImage: null, status,
});

test("no events: only the hero and the create-event empty state", () => {
  const html = render([]);
  assert.match(html, /No events yet/);
  assert.match(html, /Create your first event to start measuring networking outcomes\./);
  assert.doesNotMatch(html, /metric__value|Event performance|Not enough data yet/);
});

test("metrics and tables come from events; outcomes show an honest empty state", () => {
  const html = render([
    event("a", "Singapore", "upcoming", "2099-01-01T00:00:00.000Z", 10),
    event("b", "Davos", "completed", "2026-01-01T00:00:00.000Z", 5),
  ]);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Events<\/div>/);
  assert.match(html, /<div class="metric__value">15<\/div><div class="metric__label">Guests<\/div>/);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Cities<\/div>/);
  assert.match(html, /Not enough data yet/);
  assert.match(html, /href="\/events\/a"/);
  assert.doesNotMatch(html, /1,840|Miami|WE ARE ONE|map\.png|Move<br\/>Together/);
});
