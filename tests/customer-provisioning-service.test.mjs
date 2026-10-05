import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const input = { requestId: "33333333-3333-4333-8333-333333333333", organizationName: "Acme", ownerEmail: "ada@example.com", instanceId: "ins_test", operator: "ops" };
const reservation = { provisioning: { requestId: input.requestId, organizationId: "local-org", instanceId: input.instanceId, organizationName: input.organizationName, ownerEmail: input.ownerEmail, intendedRole: "owner", operator: input.operator, status: "pending", organizationTransportState: "queued", organizationLeaseGeneration: 0, consumedUserId: null }, invitation: { id: "44444444-4444-4444-8444-444444444444", requestId: input.requestId, instanceId: input.instanceId, providerInvitationId: null, status: "pending", deliveryState: "queued", deliveryLeaseGeneration: 0, providerCleanupPending: false, expiresAt: new Date("2030-01-01T00:00:00Z") }, created: true };

function dependencies(overrides = {}) {
  const calls = [];
  const deps = {
    now: () => new Date("2026-10-04T00:00:00Z"),
    repository: {
      reserveCustomer: async (...args) => { calls.push(["reserve", ...args]); return structuredClone(reservation); },
      findCustomer: async () => reservation.provisioning,
      findLatestInvitation: async () => reservation.invitation,
      findOrganizationIdentity: async () => null,
      saveOrganizationIdentity: async () => calls.push(["save-mapping"]),
      claimOrganizationTransport: async () => ({ generation: 1, expiresAt: new Date("2026-10-04T00:01:00Z") }),
      recordOrganizationTransport: async (_id, _generation, state) => calls.push(["organization-state", state]),
      claimOwnerDelivery: async () => ({ generation: 1, expiresAt: new Date("2026-10-04T00:01:00Z") }),
      recordOwnerDelivery: async (_id, _generation, state, providerId) => calls.push(["delivery-state", state, providerId]),
      cancelCustomer: async () => { calls.push(["cancel-local-first"]); return { provisioning: { ...reservation.provisioning, status: "cancelled" }, invitation: { ...reservation.invitation, status: "revoked", providerCleanupPending: true } }; },
      renewOwnerInvitation: async () => { calls.push(["renew-local-first"]); return { provisioning: reservation.provisioning, previousInvitation: reservation.invitation, invitation: { ...reservation.invitation, id: "new-invitation" } }; },
      markOwnerCleanup: async () => calls.push(["cleanup-cleared"]),
      listOwnerCleanup: async () => [],
      ...overrides.repository,
    },
    provider: {
      findOrganization: async () => null,
      createOrganization: async () => { calls.push(["provider-create-org"]); return { id: "provider-org" }; },
      findByCorrelation: async () => null,
      send: async () => { calls.push(["provider-send"]); return { id: "provider-invite", status: "pending" }; },
      ...overrides.provider,
    },
    appOrigin: "https://console.example.com",
    appOrigin: overrides.appOrigin ?? "https://console.example.com",
    ...(overrides.now ? { now: overrides.now } : {}),
  };
  return { deps, calls };
}

test("dry-run performs no local writes or provider calls", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  const { deps, calls } = dependencies();
  const result = await createCustomerProvisioningService(deps).createCustomer(input, { apply: false, sendInvitation: false });
  assert.equal(result.status, "dry-run");
  assert.equal(calls.length, 0);
});

test("local reservation and provider mapping precede organization and invitation transport", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  const { deps, calls } = dependencies();
  const result = await createCustomerProvisioningService(deps).createCustomer(input, { apply: true, sendInvitation: true });
  assert.equal(result.status, "sent");
  assert.deepEqual(calls.map((call) => call[0]), ["reserve", "provider-create-org", "save-mapping", "organization-state", "provider-send", "delivery-state"]);
});

test("unknown invitation outcomes are recorded and never cause an automatic second send", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let sends = 0;
  const { deps } = dependencies({ provider: {
    findByCorrelation: async () => null,
    send: async () => { sends++; throw Object.assign(new Error("hidden"), { code: "provider_timeout", outcomeUnknown: true }); },
  } });
  const service = createCustomerProvisioningService(deps);
  const first = await service.createCustomer(input, { apply: true, sendInvitation: true });
  assert.equal(first.status, "unknown");
  assert.equal(first.errorCode, "provider_timeout");
  assert.equal(sends, 1);
});

test("status is read-only and reports sanitized local state", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let reads = 0;
  const { deps, calls } = dependencies({ repository: { findCustomer: async () => { reads++; return reservation.provisioning; } } });
  const result = await createCustomerProvisioningService(deps).readCustomerStatus(input.requestId);
  assert.equal(result.status, "pending");
  assert.equal(reads, 1);
  assert.equal(calls.length, 0);
});

test("duplicate create returns its recorded state without retrying provider operations", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let providerCalls = 0;
  const { deps } = dependencies({
    repository: { reserveCustomer: async () => ({ ...structuredClone(reservation), created: false }) },
    provider: { findOrganization: async () => { providerCalls++; return null; } },
  });
  const result = await createCustomerProvisioningService(deps).createCustomer(input, { apply: true, sendInvitation: true });
  assert.equal(result.status, "pending");
  assert.equal(providerCalls, 0);
});

test("cancellation closes the local grant before provider cleanup and never resends", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  const { deps, calls } = dependencies({
    repository: { cancelCustomer: async () => { calls.push(["cancel-local-first"]); return { provisioning: { ...reservation.provisioning, status: "cancelled" }, invitation: { ...reservation.invitation, providerInvitationId: "provider-invite", providerCleanupPending: true, status: "revoked" } }; },
      listOwnerCleanup: async () => [{ ...reservation.invitation, providerInvitationId: "provider-invite", providerCleanupPending: true, status: "revoked" }],
      findOrganizationIdentity: async () => ({ organizationSubject: "provider-org" }) },
    provider: { findByCorrelation: async () => ({ id: "provider-invite", organizationSubject: "provider-org", correlationId: reservation.invitation.id, status: "pending" }),
      revoke: async () => { calls.push(["provider-revoke"]); throw Object.assign(new Error(), { code: "provider_unavailable" }); } },
  });
  const result = await createCustomerProvisioningService(deps).cancelCustomer(input.requestId, input.instanceId);
  assert.equal(result.status, "cancelled");
  assert.equal(result.cleanupPending, true);
  assert.deepEqual(calls.map((call) => call[0]), ["cancel-local-first", "provider-revoke"]);
});

test("cancellation retains cleanup pending when a late send has no established provider result", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let cleared = 0;
  let sends = 0;
  const { deps } = dependencies({
    repository: { cancelCustomer: async () => ({ provisioning: { ...reservation.provisioning, status: "cancelled" },
      invitation: { ...reservation.invitation, status: "revoked", deliveryState: "unknown", providerCleanupPending: true } }),
      listOwnerCleanup: async () => [{ ...reservation.invitation, status: "revoked", deliveryState: "unknown", providerCleanupPending: true }],
      findOrganizationIdentity: async () => ({ organizationSubject: "provider-org" }), markOwnerCleanup: async () => { cleared++; } },
    provider: { findByCorrelation: async () => null, send: async () => { sends++; throw new Error("must not send"); } },
  });
  const result = await createCustomerProvisioningService(deps).cancelCustomer(input.requestId, input.instanceId);
  assert.equal(result.cleanupPending, true);
  assert.equal(result.errorCode, "provider_outcome_unknown");
  assert.equal(cleared, 0);
  assert.equal(sends, 0);
});

test("renewal does not replace an accepted provider invitation", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let renews = 0;
  const { deps } = dependencies({ repository: {
    findCustomer: async () => reservation.provisioning,
    findLatestInvitation: async () => ({ ...reservation.invitation, expiresAt: new Date("2026-10-03T00:00:00Z") }),
    findOrganizationIdentity: async () => ({ organizationSubject: "provider-org" }),
    renewOwnerInvitation: async () => { renews++; throw new Error("must not renew"); },
  }, provider: { findByCorrelation: async () => ({ id: "provider-invite", organizationSubject: "provider-org", correlationId: reservation.invitation.id, status: "accepted" }) } });
  const result = await createCustomerProvisioningService(deps).renewOwnerInvitation(input.requestId, input.instanceId);
  assert.equal(result.status, "sent");
  assert.equal(renews, 0);
});

test("consumed customer provisioning cannot be renewed or trigger provider reconciliation", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let lookups = 0;
  let renews = 0;
  const { deps } = dependencies({
    repository: {
      findCustomer: async () => ({ ...reservation.provisioning, status: "consumed" }),
      findLatestInvitation: async () => reservation.invitation,
      renewOwnerInvitation: async () => { renews++; throw new Error("must not renew"); },
    },
    provider: { findByCorrelation: async () => { lookups++; return null; } },
  });
  await assert.rejects(
    createCustomerProvisioningService(deps).renewOwnerInvitation(input.requestId, input.instanceId),
    /Only pending customer provisioning/,
  );
  assert.equal(lookups, 0);
  assert.equal(renews, 0);
});

test("retry reconciles unknown outcomes before sending and expired invitations require renewal", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let sends = 0;
  let lookups = 0;
  const { deps, calls } = dependencies({
    repository: { findCustomer: async () => reservation.provisioning, findLatestInvitation: async () => ({ ...reservation.invitation, expiresAt: new Date("2026-10-03T00:00:00Z") }) },
    provider: { findByCorrelation: async () => { lookups++; return null; }, send: async () => { sends++; return { id: "provider-invite", status: "pending" }; } },
  });
  const result = await createCustomerProvisioningService(deps).retryCustomer(input.requestId, input.instanceId);
  assert.equal(result.status, "failed");
  assert.equal(result.errorCode, "owner_invitation_expired_requires_renewal");
  assert.equal(lookups, 1);
  assert.equal(sends, 0);
  assert.equal(calls.includes("provider-send"), false);
});

test("provider error strings are sanitized before persistence or CLI output", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  const { deps } = dependencies({ provider: { send: async () => { throw Object.assign(new Error("secret"), { code: "secret@example.com" }); } } });
  const result = await createCustomerProvisioningService(deps).createCustomer(input, { apply: true, sendInvitation: true });
  assert.equal(result.errorCode, "provider_error");
  assert.equal(JSON.stringify(result).includes("secret@example.com"), false);
});

test("a worker that loses its organization lease cannot map or send the owner invitation", async () => {
  const { createCustomerProvisioningService } = loadTs("src/modules/organizations/customer-provisioning/service.ts");
  let invitationsSent = 0;
  const { deps } = dependencies({ repository: { saveProvisionedOrganizationIdentity: async () => false },
    provider: { send: async () => { invitationsSent++; return { id: "provider-invite", status: "pending" }; } } });
  const result = await createCustomerProvisioningService(deps).createCustomer(input, { apply: true, sendInvitation: true });
  assert.equal(result.status, "unknown");
  assert.equal(result.errorCode, "organization_lease_lost");
  assert.equal(invitationsSent, 0);
});
