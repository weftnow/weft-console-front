import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = (path) => readFileSync(new URL(`../src/app/${path}`, import.meta.url), "utf8");

test("organizer dashboard routes resolve Neon context before rendering fixture components", () => {
  for (const [path, component] of [
    ["page.tsx", "OrganizerOverview"], ["events/page.tsx", "EventsPage"],
    ["network/page.tsx", "NetworkPage"], ["people/page.tsx", "PeoplePage"],
  ]) {
    const source = route(path);
    assert.match(source, /requireOrganizerPageContext\(/, `${path} needs organization authorization`);
    assert.ok(source.indexOf("requireOrganizerPageContext(") < source.indexOf(`<${component}`), `${path} must authorize before rendering`);
  }
});

test("partner report requires a Clerk session but never renders unscoped fixture reports", () => {
  const source = route("partner-report/page.tsx");
  assert.match(source, /requireClerkSession\(/);
  assert.doesNotMatch(source, /<PartnerReportPage/);
  assert.match(source, /unavailable/i);
});

test("event detail authorizes its event before resolving the displayed organization context", () => {
  const source = route("events/[eventId]/page.tsx");
  assert.ok(source.indexOf("getEvent({") < source.indexOf("requireOrganizationContext({"));
  assert.match(source, /allowedRoles: \["owner", "organizer"\]/);
});
