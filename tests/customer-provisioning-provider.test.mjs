import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

test("bootstrap provider reconciles exact local organization UUIDs and creates without an inviter", async () => {
  const { createCustomerProvisioningProvider } = loadTs("src/modules/organizations/customer-provisioning/clerk-provider.ts");
  let createInput;
  const offsets = [];
  const provider = createCustomerProvisioningProvider({ organizations: {
    getOrganizationList: async ({ offset }) => { offsets.push(offset); return offset === 0
      ? { data: [{ id: "similar", name: "Customer", publicMetadata: { weftOrganizationId: "other" } }], totalCount: 101 }
      : { data: [{ id: "exact", name: "Renamed", publicMetadata: { weftOrganizationId: "local-org" } }], totalCount: 101 }; },
    createOrganization: async (input) => { createInput = input; return { id: "new-org", name: input.name, publicMetadata: input.publicMetadata }; },
    createOrganizationInvitation: async (input) => ({ id: "provider-invite", organizationId: input.organizationId, emailAddress: input.emailAddress, status: "pending", createdAt: Date.now(), publicMetadata: input.publicMetadata }),
  } });
  assert.deepEqual(await provider.findOrganization("local-org"), { id: "exact" });
  assert.deepEqual(offsets, [0, 100]);
  assert.deepEqual(await provider.createOrganization({ name: "Customer", localOrganizationId: "local-org" }), { id: "new-org" });
  assert.deepEqual(createInput, { name: "Customer", publicMetadata: { weftOrganizationId: "local-org" } });
  assert.equal("createdBy" in createInput, false);
});

test("bootstrap invitations use transport role and local correlation only", async () => {
  const { createCustomerProvisioningProvider } = loadTs("src/modules/organizations/customer-provisioning/clerk-provider.ts");
  let invitationInput;
  const provider = createCustomerProvisioningProvider({ organizations: {
    getOrganizationList: async () => ({ data: [], totalCount: 0 }),
    createOrganization: async () => ({ id: "unused", name: "Customer", publicMetadata: {} }),
    createOrganizationInvitation: async (input) => { invitationInput = input; return { id: "provider-invite", organizationId: input.organizationId, emailAddress: input.emailAddress, status: "pending", createdAt: Date.now(), publicMetadata: input.publicMetadata }; },
  } });
  const result = await provider.send({ organizationSubject: "provider-org", email: "owner@example.com", correlationId: "local-invite", redirectUrl: "https://console.example.com/accept-invitation?invitation=local-invite" });
  assert.equal(invitationInput.role, "org:member");
  assert.equal(invitationInput.expiresInDays, 7);
  assert.deepEqual(invitationInput.publicMetadata, { weftInvitationId: "local-invite" });
  assert.equal(invitationInput.publicMetadata.ownerEmail, undefined);
  assert.equal(invitationInput.publicMetadata.role, undefined);
  assert.equal(result.id, "provider-invite");
});

test("provider organization duplicate correlations fail closed", async () => {
  const { createCustomerProvisioningProvider } = loadTs("src/modules/organizations/customer-provisioning/clerk-provider.ts");
  const provider = createCustomerProvisioningProvider({ organizations: {
    getOrganizationList: async () => ({ data: ["one", "two"].map((id) => ({ id, name: "Customer", publicMetadata: { weftOrganizationId: "local-org" } })), totalCount: 2 }),
  } });
  await assert.rejects(provider.findOrganization("local-org"), (error) => error.code === "provider_ambiguous");
});
