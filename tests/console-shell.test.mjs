import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";

stubTs("@/shared/ui/console-account", {
  ConsoleAccount: ({ user, organization }) =>
    React.createElement("div", { className: "profile" }, `${user.displayName} · ${organization.name} · ${organization.role}`),
});

const context = {
  user: { id: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f", displayName: "Ada Lovelace", avatarUrl: null },
  organization: { id: "0b0d7f7c-1e0c-4a39-9a1e-8f2b5e4f4c11", name: "Analytical Engines" },
  membership: { id: "membership-1", role: "organizer" },
};

const render = (props) => {
  const { ConsoleSidebar } = loadTs("src/shared/ui/console-sidebar.tsx");
  return renderToStaticMarkup(React.createElement(ConsoleSidebar, { context, ...props }));
};

test("sidebar identifies the active organization without promotional noise", () => {
  const html = render({ active: "overview" });
  assert.match(html, /aria-label="Analytical Engines"/);
  assert.match(html, /class="brand-wordmark">Analytical Engines<\/span>/);
  assert.doesNotMatch(html, /brand-story|The networking layer/);
  assert.doesNotMatch(html, /WE ARE ONE|We Are One|Nick|Stronger Tomorrow/i);
});

test("sidebar profile is the Clerk account control fed by the server-resolved context", () => {
  assert.match(render({ active: "events" }), /Ada Lovelace · Analytical Engines · organizer/);
});

test("unsupported Outcomes navigation is disabled, not a dead anchor", () => {
  const html = render({ active: "overview" });
  assert.doesNotMatch(html, /href="#outcomes"/);
  assert.match(html, /aria-disabled="true"[^>]*>.*Outcomes/s);
});

test("events shell keeps exactly one primary navigation outside the route main", () => {
  process.env.WEFT_TEAM_INVITATIONS = "enabled";
  const { EventsShell } = loadTs("src/modules/events/components/events-shell.tsx");
  const { EventDetailSkeleton } = loadTs("src/modules/events/components/event-detail-skeleton.tsx");
  const html = renderToStaticMarkup(React.createElement(EventsShell,
    { context: { ...context, membership: { ...context.membership, role: "owner" } } },
    React.createElement(EventDetailSkeleton),
  ));
  assert.equal(html.match(/aria-label="Primary navigation"/g)?.length, 1);
  assert.equal(html.match(/<main\b/g)?.length, 1);
  assert.ok(html.indexOf('aria-label="Primary navigation"') < html.indexOf('<main'));
  assert.match(html, /href="\/settings\/team"/);
  assert.doesNotMatch(html, /dashboard-layout[^]*dashboard-layout/);
});

test("events shell omits Team for owners until team invitations are enabled", () => {
  delete process.env.WEFT_TEAM_INVITATIONS;
  const { EventsShell } = loadTs("src/modules/events/components/events-shell.tsx");
  const owner = { ...context, membership: { ...context.membership, role: "owner" } };
  const html = renderToStaticMarkup(React.createElement(EventsShell, { context: owner }, React.createElement("main", null, "Events")));
  assert.doesNotMatch(html, /href="\/settings\/team"/);
});

test("events shell omits Team for organizers", () => {
  const { EventsShell } = loadTs("src/modules/events/components/events-shell.tsx");
  const html = renderToStaticMarkup(React.createElement(EventsShell, { context }, React.createElement("main", null, "Events")));
  assert.doesNotMatch(html, /href="\/settings\/team"/);
});

test("event pages and fallbacks leave shell ownership to the Events layout", () => {
  for (const path of [
    "src/modules/events/components/events-page.tsx",
    "src/modules/events/components/create-event-page.tsx",
    "src/modules/events/components/event-detail-page.tsx",
    "src/modules/events/components/event-access-state.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /ConsoleSidebar|className="dashboard-layout"/u, path);
  }
  const layout = readFileSync("src/app/events/layout.tsx", "utf8");
  assert.match(layout, /requireOrganizerPageContext/u);
  assert.match(layout, /cleanupInvalidSelection:\s*false/u);
});

test("event access fallback stays in the one main landmark", () => {
  const { EventAccessState } = loadTs("src/modules/events/components/event-access-state.tsx");
  const html = renderToStaticMarkup(React.createElement(EventAccessState, {
    title: "Access required",
    description: "Unavailable.",
  }));
  assert.equal(html.match(/<main\b/gu)?.length, 1);
  assert.match(html, /class="dashboard-main event-detail-main"/u);
  assert.doesNotMatch(html, /dashboard-layout|Primary navigation/u);
});

test("detail API checks event authorization against the event organization independently of shell context", () => {
  const route = readFileSync("src/infrastructure/http/get-event-handler.ts", "utf8");
  assert.match(route, /getEvent\(\{ userId: actor\.id, eventId \}\)/u);
  assert.match(route, /requireOrganizationContext\(\{ user: actor, organizationId: event\.organizationId, allowedRoles: \["owner", "organizer"\] \}\)/u);
  assert.ok(route.indexOf("getEvent({ userId: actor.id, eventId })") < route.indexOf("organizationId: event.organizationId"));
});
