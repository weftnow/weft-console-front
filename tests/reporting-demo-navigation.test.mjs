import assert from "node:assert/strict";
import test from "node:test";
import { loadTs, stubTs } from "./load-ts.mjs";

const eventId = "1f50ef3c-7bb0-4ee8-94f5-3c1764ec9d35";
const context = { user: { id: "user" }, organization: { id: "org", name: "Organization" } };
const calls = [];
let mode;
let authorized;

stubTs("@/infrastructure/auth/console-page-context", {
  requireOrganizerPageContext: async () => {
    if (!authorized) throw new Error("ACCESS_REQUIRED");
    return context;
  },
});
stubTs("@/modules/network/server/engine-mode", { matchingEngineMode: () => mode });
stubTs("@/modules/insights/components/reporting-page", { ReportingPage: () => null });
stubTs("@/modules/insights/components/evidence-editor", { EvidenceEditor: () => null });
stubTs("@/shared/i18n/get-locale", { getLocale: async () => "en" });
stubTs("@/modules/insights/server/reporting-evidence", {
  readReportingSources: async (scope, selection) => {
    calls.push({ scope, selection });
    return { events: [], sources: [], selectedEventId: selection.eventId };
  },
  getReportingEvidence: async (scope) => {
    calls.push(scope);
    return { revision: 0, evidence: {} };
  },
});

const reports = loadTs("src/app/outcomes/reports/page.tsx").default;
const evidence = loadTs("src/app/outcomes/reports/evidence/page.tsx").default;
const params = (values = {}) => ({ searchParams: Promise.resolve(values) });

test.beforeEach(() => {
  mode = "simulation";
  authorized = true;
  calls.length = 0;
});

test("the demo opens existing outcomes charts before touching reporting storage", async () => {
  await assert.rejects(reports(params()), { digest: "NEXT_REDIRECT;replace;/outcomes;307;" });
  const selectedEvent = { digest: `NEXT_REDIRECT;replace;/outcomes?eventId=${eventId};307;` };
  await assert.rejects(reports(params({ eventId, view: "across" })), selectedEvent);
  await assert.rejects(evidence(params({ eventId })), selectedEvent);
  assert.deepEqual(calls, []);
});

test("demo navigation still checks access and rejects malformed event IDs", async () => {
  await assert.rejects(reports(params({ eventId: [eventId, eventId] })), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  await assert.rejects(evidence(params()), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  authorized = false;
  await assert.rejects(reports(params({ eventId })), /ACCESS_REQUIRED/);
  await assert.rejects(evidence(params({ eventId })), /ACCESS_REQUIRED/);
  assert.deepEqual(calls, []);
});

test("engine mode still opens the new reports with the authorized, selected event scope", async () => {
  mode = "engine";
  await reports(params({ eventId }));
  assert.deepEqual(calls, [{ scope: { userId: "user", organizationId: "org" }, selection: { eventId, across: false } }]);
});
