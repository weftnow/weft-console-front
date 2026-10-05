import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

test("event loading is one accessible main region with decorative content placeholders", () => {
  const { EventDetailSkeleton } = loadTs("src/modules/events/components/event-detail-skeleton.tsx");
  const html = renderToStaticMarkup(React.createElement(EventDetailSkeleton));
  assert.match(html, /<main[^>]*aria-busy="true"[^>]*aria-label="Loading event"[^>]*class="dashboard-main event-detail-main"/u);
  assert.equal(html.match(/<main\b/gu)?.length, 1);
  assert.match(html, /aria-hidden="true"/u);
  assert.match(html, /event-detail-skeleton--header/u);
  assert.match(html, /event-detail-skeleton--hero/u);
  assert.match(html, /event-detail-skeleton--tabs/u);
  assert.match(html, /event-detail-skeleton--metric/gu);
  assert.match(html, /event-detail-skeleton--overview/u);
  assert.doesNotMatch(html, /Primary navigation|dashboard-layout|<a\b|<button\b/u);
});

test("loaded and loading heroes stay within the main column at narrow desktop widths", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.event-detail-hero, \.event-detail-skeleton--hero\s*\{[^}]*width:\s*100%/u);
});

test("cached detail route delegates data loading to the client without a route skeleton", () => {
  const route = readFileSync("src/app/events/[eventId]/page.tsx", "utf8");
  assert.match(route, /await requireClerkSession\(\)/);
  assert.match(route, /EventDetailQueryPage/);
  assert.doesNotMatch(route, /getEvent\(|requireOrganizationContext\(|requireLocalActor\(/);
  assert.equal(existsSync("src/app/events/[eventId]/loading.tsx"), false);
});
