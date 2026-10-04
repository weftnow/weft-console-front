import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const orgId = "22222222-2222-4222-8222-222222222222";

function setupDeps(overrides = {}) {
  const calls = { writes: 0, saved: [], updated: [] };
  return { calls, value: {
    localOrganizations: async () => [{ id: orgId, name: "Weft Summit" }],
    findOrganizationIdentity: async () => null,
    saveOrganizationIdentity: async (input) => { calls.saved.push(input); },
    provider: {
      listOrganizations: async () => [],
      createOrganization: async (input) => { calls.writes++; calls.updated.push(input); return { id: "org_created", publicMetadata: input.publicMetadata }; },
      updateOrganizationMetadata: async (...args) => { calls.writes++; calls.updated.push(args); },
    },
    ...overrides,
  } };
}

test("default setup is a dry run with no provider or local writes", async () => {
  const { setupOrganizations } = loadTs("scripts/setup-clerk-organizations.ts");
  const d = setupDeps();
  const result = await setupOrganizations({ apply: false, target: undefined, instanceId: "ins_test", organizationIds: [orgId] }, d.value);
  assert.equal(result.mode, "dry-run");
  assert.equal(d.calls.writes, 0);
  assert.equal(d.calls.saved.length, 0);
});

test("apply requires an explicit development or test target and exact organization UUIDs", async () => {
  const { setupOrganizations } = loadTs("scripts/setup-clerk-organizations.ts");
  for (const options of [
    { apply: true, target: undefined, instanceId: "ins_test", organizationIds: [orgId] },
    { apply: true, target: "production", instanceId: "ins_test", organizationIds: [orgId] },
    { apply: true, target: "development", instanceId: "", organizationIds: [orgId] },
    { apply: true, target: "test", instanceId: "ins_test", organizationIds: ["org-name"] },
  ]) {
    const d = setupDeps();
    await assert.rejects(setupOrganizations(options, d.value));
    assert.equal(d.calls.writes, 0);
  }
});

test("exact provider metadata recovers a crash and mapping is idempotent", async () => {
  const { setupOrganizations } = loadTs("scripts/setup-clerk-organizations.ts");
  const d = setupDeps({ provider: {
    listOrganizations: async () => [{ id: "org_exact", name: "Different name", publicMetadata: { weftOrganizationId: orgId } }],
    createOrganization: async () => { throw new Error("must not duplicate"); }, updateOrganizationMetadata: async () => {},
  } });
  const result = await setupOrganizations({ apply: true, target: "development", instanceId: "ins_dev", organizationIds: [orgId] }, d.value);
  assert.equal(result.organizations[0].providerOrganizationId, "org_exact");
  assert.deepEqual(d.calls.saved, [{ organizationId: orgId, instanceId: "ins_dev", organizationSubject: "org_exact" }]);
  assert.equal(d.calls.writes, 0);
});

test("multiple exact provider metadata matches fail without selecting one", async () => {
  const { setupOrganizations } = loadTs("scripts/setup-clerk-organizations.ts");
  const exact = { publicMetadata: { weftOrganizationId: orgId } };
  const d = setupDeps({ provider: { listOrganizations: async () => [{ id: "org_one", ...exact }, { id: "org_two", ...exact }] } });
  await assert.rejects(setupOrganizations({ apply: false, target: undefined, instanceId: "ins_test", organizationIds: [orgId] }, d.value), /multiple/i);
  assert.equal(d.calls.writes, 0);
});
