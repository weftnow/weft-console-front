import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actor = { userId: "11111111-1111-4111-8111-111111111111", organizationId: "22222222-2222-4222-8222-222222222222" };
const invitation = { id: "33333333-3333-4333-8333-333333333333", organizationId: actor.organizationId, instanceId: "ins_test", email: "a@example.com", role: "organizer", inviterUserId: actor.userId, providerInvitationId: null, status: "pending", deliveryState: "queued", deliveryLeaseUntil: null, deliveryErrorCode: null, providerCleanupPending: false, createdAt: new Date("2026-01-01T00:00:00Z"), expiresAt: new Date("2026-01-08T00:00:00Z"), acceptedAt: null, acceptedSubject: null, acceptedUserId: null };
const view = { id: invitation.id, email: invitation.email, role: invitation.role, status: "pending", deliveryState: "queued", providerCleanupPending: false, createdAt: invitation.createdAt.toISOString(), expiresAt: invitation.expiresAt.toISOString() };

function deps(overrides = {}) {
  const calls = { sent: [], reserved: [], recorded: [], revoked: [] };
  return { calls, value: {
    now: () => new Date("2026-01-02T00:00:00Z"), instanceId: "ins_test", appOrigin: "https://console.example.com",
    authorizeOwner: async () => {}, findOrganizationIdentity: async () => ({ organizationSubject: "org_clerk" }),
    findActiveMemberByEmail: async () => null,
    listPreviousInvitationsForEmail: async () => [], expireInvitation: async () => invitation,
    reserveInvitation: async (input) => { calls.reserved.push(input); return { invitation, created: true }; },
    findInvitation: async () => invitation, listInvitationViews: async () => [view],
    claimDelivery: async () => true,
    recordDelivery: async (...args) => { calls.recorded.push(args); },
    markProviderCleanup: async () => {},
    revokePendingInvitation: async () => ({ ...invitation, status: "revoked" }),
    provider: {
      send: async (input) => { calls.sent.push(input); return { id: "clerk_invite", organizationSubject: "org_clerk", email: input.email, correlationId: input.correlationId, status: "pending" }; },
      findByCorrelation: async () => null,
      revoke: async (...args) => { calls.revoked.push(args); },
    },
    ...overrides,
  } };
}

test("owner send delivers once and duplicate reservation preserves the original role", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps();
  const first = await sendInvitation(actor, { email: " A@Example.com ", role: "organizer" }, d.value);
  assert.equal(first.kind, "sent");
  assert.equal(d.calls.sent.length, 1);
  assert.equal(d.calls.reserved[0].email, "a@example.com");
  assert.equal(d.calls.sent[0].correlationId, invitation.id);
  assert.equal(d.calls.sent[0].redirectUrl, `https://console.example.com/accept-invitation?invitation=${invitation.id}`);

  const duplicate = deps({ reserveInvitation: async () => ({ invitation: { ...invitation, role: "owner" }, created: false }) });
  assert.equal((await sendInvitation(actor, { email: invitation.email, role: "owner" }, duplicate.value)).kind, "existing");
  assert.equal(duplicate.calls.sent.length, 0);
});

test("existing local member is rejected without sending or changing roles", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({ findActiveMemberByEmail: async () => ({ role: "organizer", active: true }) });
  await assert.rejects(sendInvitation(actor, { email: "a@example.com", role: "owner" }, d.value), (error) => error.code === "CONFLICT");
  assert.equal(d.calls.sent.length, 0);
  assert.equal(d.calls.reserved.length, 0);
});

test("provider timeout records unknown delivery without claiming it was sent", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({ provider: { ...deps().value.provider, send: async () => { throw Object.assign(new Error("timeout"), { outcomeUnknown: true, code: "timeout" }); } } });
  const result = await sendInvitation(actor, { email: "a@example.com", role: "organizer" }, d.value);
  assert.equal(result.kind, "delivery-pending");
  assert.equal(d.calls.recorded[0][1].state, "unknown");
  assert.equal(d.calls.recorded[0][1].errorCode, "provider_timeout");
});

test("retry reconciles a provider send already accepted before the response was lost", async () => {
  const { retryInvitationDelivery } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({
    findInvitation: async () => ({ ...invitation, deliveryState: "unknown" }),
    provider: { ...deps().value.provider, findByCorrelation: async () => ({ id: "previous", status: "pending", organizationSubject: "org_clerk", email: invitation.email, correlationId: invitation.id }) },
  });
  const result = await retryInvitationDelivery(actor, invitation.id, d.value);
  assert.equal(result.deliveryState, "sent");
  assert.equal(d.calls.sent.length, 0);
  assert.equal(d.calls.recorded[0][1].providerInvitationId, "previous");
});

test("unknown delivery with no exact provider evidence stays unknown", async () => {
  const { retryInvitationDelivery } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({ findInvitation: async () => ({ ...invitation, deliveryState: "unknown" }) });
  const result = await retryInvitationDelivery(actor, invitation.id, d.value);
  assert.equal(result.deliveryState, "unknown");
  assert.equal(d.calls.sent.length, 0);
});

test("retry does not report a revoked provider invitation as sent", async () => {
  const { retryInvitationDelivery } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({
    findInvitation: async () => ({ ...invitation, deliveryState: "unknown" }),
    provider: { ...deps().value.provider, findByCorrelation: async () => ({ id: "old", status: "revoked", organizationSubject: "org_clerk", email: invitation.email, correlationId: invitation.id }) },
  });
  const result = await retryInvitationDelivery(actor, invitation.id, d.value);
  assert.equal(result.deliveryState, "failed");
  assert.equal(d.calls.sent.length, 0);
  assert.equal(d.calls.recorded[0][1].providerInvitationId, "old");
});

test("an expired ambiguous delivery blocks a second email until its outcome is reconciled", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({
    listPreviousInvitationsForEmail: async () => [{ ...invitation, status: "expired", deliveryState: "unknown" }],
    provider: { ...deps().value.provider, findByCorrelation: async () => null },
  });
  await assert.rejects(sendInvitation(actor, { email: "a@example.com", role: "organizer" }, d.value), (error) => error.code === "CONFLICT");
  assert.equal(d.calls.reserved.length, 0);
  assert.equal(d.calls.sent.length, 0);
});

test("an expired provider invitation is revoked before a fresh invitation is delivered", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const order = [];
  const d = deps({
    listPreviousInvitationsForEmail: async () => [{ ...invitation, status: "expired", deliveryState: "sent", providerInvitationId: "old_invite" }],
    provider: {
      ...deps().value.provider,
      findByCorrelation: async () => ({ id: "old_invite", organizationSubject: "org_clerk", email: invitation.email, correlationId: invitation.id, status: "pending" }),
      revoke: async () => { order.push("revoke"); },
      send: async (input) => { order.push("send"); return { id: "new_invite", organizationSubject: "org_clerk", email: input.email, correlationId: input.correlationId, status: "pending" }; },
    },
  });
  assert.equal((await sendInvitation(actor, { email: "a@example.com", role: "organizer" }, d.value)).kind, "sent");
  assert.deepEqual(order, ["revoke", "send"]);
});

test("timely accepted invitation remains consumable after expiry and blocks replacement", async () => {
  const { sendInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  let expired = 0;
  const d = deps({
    listPreviousInvitationsForEmail: async () => [{ ...invitation, status: "pending", deliveryState: "sent", providerInvitationId: "old_invite" }],
    expireInvitation: async () => { expired++; return null; },
    provider: { ...deps().value.provider, findByCorrelation: async () => ({ id: "old_invite", organizationSubject: "org_clerk", email: invitation.email, correlationId: invitation.id, status: "accepted" }) },
  });
  await assert.rejects(sendInvitation(actor, { email: "a@example.com", role: "owner" }, d.value), (error) => error.code === "CONFLICT");
  assert.equal(expired, 0);
  assert.equal(d.calls.sent.length, 0);
});

test("revoke is local first and failed provider cleanup is visible", async () => {
  const { revokeInvitation } = loadTs("src/modules/organizations/invitations/service.ts");
  const d = deps({
    revokePendingInvitation: async () => ({ ...invitation, status: "revoked", providerInvitationId: "clerk_invite" }),
    provider: { ...deps().value.provider, revoke: async () => { throw new Error("remote detail and secrets"); } },
  });
  const result = await revokeInvitation(actor, invitation.id, d.value);
  assert.equal(result.status, "revoked");
  assert.equal(result.providerCleanupPending, true);
});
