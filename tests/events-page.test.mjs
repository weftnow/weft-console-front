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
const event = (id, status, startsAt) => ({
  id, name: `Event ${id}`, city: "Singapore", venue: "", startDate: startsAt.slice(0, 10), endDate: startsAt.slice(0, 10),
  startsAt, endsAt: startsAt, timezone: "Asia/Singapore", guestCount: 12, coverImage: null, status,
});
const render = (events) => {
  const { EventsPage } = loadTs("src/modules/events/components/events-page.tsx");
  return renderToStaticMarkup(React.createElement(EventsPage, { context, events }));
};

test("no events shows the page empty state with one create action", () => {
  const html = render([]);
  assert.match(html, /No events yet/);
  assert.match(html, /Create your first event to start operating its networking experience\./);
  assert.equal(html.match(/href="\/events\/new"/g)?.length, 1); // only the empty-state action; no duplicate header CTA
  assert.doesNotMatch(html, /Upcoming events|Recently completed|All events/);
});

test("protected covers bypass image optimization; static art does not", () => {
  const { CityArtwork } = loadTs("src/shared/ui/city-artwork.tsx");
  const { eventArt } = loadTs("src/modules/events/event-list.ts");
  const html = renderToStaticMarkup(React.createElement(CityArtwork, { art: eventArt({ coverImage: "/api/events/x/cover" }) }));
  assert.match(html, /src="\/api\/events\/x\/cover"/);
  assert.doesNotMatch(html, /_next\/image/);
});

test("events render from data with real links and counts", () => {
  const html = render([event("11111111-1111-4111-8111-111111111111", "upcoming", "2099-01-01T00:00:00.000Z")]);
  assert.match(html, /href="\/events\/11111111-1111-4111-8111-111111111111"/);
  assert.match(html, /New event/);
  assert.match(html, /Showing 1 event/);
  assert.match(html, /No live events right now/);
  assert.match(html, /No completed events yet/);
  assert.doesNotMatch(html, /Las Vegas|We Are One|las-vegas-f1-week|Showing 8 of 12/);
});
