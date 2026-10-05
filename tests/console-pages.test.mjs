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
  assert.ok(source.indexOf("requireClerkSession(") < source.indexOf("<PartnerReportPage"), "partner report must check the session before rendering");
  const component = readFileSync(new URL("../src/modules/sponsors/components/partner-report-page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /partner-report-data|Horizon/);
  assert.match(component, /No partner report yet/);
});

test("event detail API authorizes its event before checking membership in the event organization", () => {
  const source = readFileSync(new URL("../src/infrastructure/http/get-event-handler.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("dependencies.getEvent({") < source.indexOf("dependencies.requireOrganizationContext({"));
  assert.match(source, /allowedRoles: \["owner", "organizer"\]/);
});
