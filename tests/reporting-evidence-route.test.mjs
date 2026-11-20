import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { loadTs, stubTs } from "./load-ts.mjs";

const require = createRequire(import.meta.url);
const nextCache = require("next/cache");
const nextHeaders = require("next/headers");
const id = "1f50ef3c-7bb0-4ee8-94f5-3c1764ec9d35";
const userId = "90b75d73-157c-4ccf-b90e-1b7a25213ae2";
const organizationId = "d5dd70f1-92aa-472c-8880-76c28af9a140";
const otherOrganizationId = "a225aa0e-caf6-4f8c-8854-8ca464d1784a";
const url = new URL(`https://console.example/api/events/${id}/reporting-evidence`);
const context = { params: Promise.resolve({ eventId: id }) };
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");
const calls = [];
let user;
let memberships;
let selection;

stubTs("@/infrastructure/auth/current-user", { getCurrentUser: async () => user });
stubTs("@/modules/organizations/repository", { listActiveMemberships: async () => memberships });
stubTs("@/modules/insights/server/reporting-evidence", {
  getReportingEvidence: async (scope) => {
    calls.push(["get", scope]);
    if (scope.organizationId !== organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
    return { revision: 1, evidence: { participants: [] } };
  },
  saveReportingEvidence: async (scope) => {
    calls.push(["save", scope]);
    if (scope.expectedRevision === 0) throw new ApplicationError("CONFLICT", "Reload the document.");
    return { revision: 2, evidence: scope.evidence };
  },
});

const { GET, PUT } = loadTs("src/app/api/events/[eventId]/reporting-evidence/route.ts");
const put = (value, { origin = url.origin, type = "application/json" } = {}) => new Request(url, {
  method: "PUT", headers: { origin, "Content-Type": type }, body: JSON.stringify(value),
});
const owner = { userId, organizationId, role: "owner", active: true };
const scope = { userId, organizationId, eventId: id };

test.beforeEach((t) => {
  calls.length = 0;
  user = { id: userId };
  memberships = [owner];
  selection = undefined;
  t.mock.method(nextHeaders, "cookies", async () => ({ get: () => selection && { value: selection } }));
  t.mock.method(nextCache, "revalidatePath", (path) => calls.push(["refresh", path]));
});

test("reporting evidence is private and requires active local organizer access", async () => {
  user = null;
  assert.equal((await GET(new Request(url), context)).status, 401);
  user = { id: userId };
  for (const member of [{ role: "staff" }, { role: "sponsor" }, { active: false }]) {
    memberships = [{ ...owner, ...member }];
    assert.equal((await GET(new Request(url), context)).status, 403);
    assert.equal((await PUT(put({}), context)).status, 403);
  }
  assert.deepEqual(calls, []);
  memberships = [{ ...owner, role: "organizer" }];
  const response = await GET(new Request(url), context);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { data: { revision: 1, evidence: { participants: [] } } });
  assert.deepEqual(calls, [["get", scope]]);

  memberships = [...memberships, { ...owner, organizationId: otherOrganizationId }];
  selection = JSON.stringify({ userId, organizationId: otherOrganizationId });
  const hidden = await GET(new Request(url), context);
  assert.equal(hidden.status, 404);
  assert.equal((await hidden.json()).data, undefined);
});

test("replacing evidence validates origin, body and revision before taking a trusted scope", async () => {
  const payload = { expectedRevision: 1, evidence: { requests: [] } };
  assert.equal((await PUT(put(payload, { origin: "https://other.example" }), context)).status, 403);
  assert.equal((await PUT(put(payload, { type: "text/plain" }), context)).status, 415);
  assert.equal((await PUT(put({ ...payload, organizationId: otherOrganizationId }), context)).status, 422);
  assert.equal((await PUT(put({ ...payload, expectedRevision: -1 }), context)).status, 422);
  assert.equal((await PUT(put({ ...payload, evidence: null }), context)).status, 422);
  assert.deepEqual(calls, []);

  const conflict = await PUT(put({ ...payload, expectedRevision: 0 }), context);
  assert.equal(conflict.status, 409);
  assert.deepEqual(calls, [["save", { ...scope, ...payload, expectedRevision: 0 }]]);

  calls.length = 0;
  const response = await PUT(put(payload), context);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { data: { revision: 2, evidence: payload.evidence } });
  assert.deepEqual(calls, [["save", { ...scope, ...payload }], ["refresh", "/outcomes/reports"], ["refresh", "/outcomes/reports/evidence"]]);
});
