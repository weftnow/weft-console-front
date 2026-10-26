import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const render = (path, name, props = {}) => renderToStaticMarkup(React.createElement(loadTs(path)[name], props));

test("people page is an on-brand empty state", () => {
  const html = render("src/modules/attendees/components/people-page.tsx", "PeoplePage", { context });
  assert.match(html, /<h1[^>]*>People<\/h1>/);
  assert.match(html, /No people yet/);
  assert.match(html, /Guests appear here once you add them to an event\./);
  assert.doesNotMatch(html, /Sarah Chen|1,840|Northstar/);
});

test("network page is an on-brand empty state", () => {
  const html = render("src/modules/network/components/network-page.tsx", "NetworkPage", { context });
  assert.match(html, /Your network starts here/);
  assert.match(html, /It builds as introductions happen at your events\./);
  assert.doesNotMatch(html, /1,842|avatars/);
});

test("partner report is an on-brand empty state without console navigation", () => {
  const html = render("src/modules/sponsors/components/partner-report-page.tsx", "PartnerReportPage");
  assert.match(html, /No partner report yet/);
  assert.match(html, /Reports appear after a partner&#x27;s event has outcomes\./);
  assert.doesNotMatch(html, /Horizon|Primary navigation/);
});

test("pages share root branding instead of placing duplicate footers below their content", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.match(layout, /<footer className="weft-page-branding"><PoweredByWeft \/><\/footer>/);
  for (const [path, name] of [["src/modules/attendees/components/people-page.tsx", "PeoplePage"], ["src/modules/network/components/network-page.tsx", "NetworkPage"]]) {
    const html = render(path, name, { context });
    assert.doesNotMatch(html, /dashboard-footer/);
    assert.doesNotMatch(html, /sidebar-branding|powered-by-weft/);
  }
});

test("partner report has a page heading", () => {
  const html = render("src/modules/sponsors/components/partner-report-page.tsx", "PartnerReportPage");
  assert.match(html, /<h1[^>]*>Partner report<\/h1>/);
});

for (const file of ["src/app/error.tsx", "src/app/events/error.tsx"]) {
  test(`${file} renders the events unavailable state`, () => {
    const Page = loadTs(file).default;
    const html = renderToStaticMarkup(React.createElement(Page, { error: new Error("x"), retry: () => {}, reset: () => {} }));
    assert.match(html, /<h1>Events unavailable<\/h1>/);
    assert.match(html, /Your events could not be loaded\. Please try again\./);
    assert.match(html, /<button[^>]*>Try again<\/button>/);
    assert.doesNotMatch(html, /Back to events/);
  });
}
