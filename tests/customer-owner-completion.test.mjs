import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const id = "44444444-4444-4444-8444-444444444444";
const instanceId = "ins_test";
const subject = "user_owner";
const admission = { provisioning: { requestId: "33333333-3333-4333-8333-333333333333", organizationId: "local-org", instanceId,
  ownerEmail: "ada+owner@example.com", intendedRole: "owner", status: "pending", consumedSubject: null, consumedUserId: null },
  invitation: { id, requestId: "33333333-3333-4333-8333-333333333333", instanceId, status: "pending", createdAt: new Date("2026-09-01T00:00:00Z"), expiresAt: new Date("2026-09-08T00:00:00Z") } };
const evidence = { subject, organizationSubject: "provider-org", membershipId: "membership", correlationId: id,
  invitationEmail: "ada+owner@example.com", acceptedAt: new Date("2026-09-07T00:00:00Z"), verifiedEmails: ["ada@example.com", "ada+owner@example.com"], displayName: "Ada Lovelace", avatarUrl: null };

function dependencies(overrides = {}) {
  const calls = { commit: [], discover: 0 };
  const value = {
    instanceId,
    findProvisioningForInvitation: async () => admission,
    findOrganizationIdentity: async () => ({ organizationSubject: "provider-org" }),
    listOwnerInvitationCandidates: async () => { calls.discover++; return [{ invitationId: id, email: admission.provisioning.ownerEmail,
      organizationName: "Acme", organizationSubject: "provider-org", createdAt: admission.invitation.createdAt, expiresAt: admission.invitation.expiresAt }]; },
    commitInitialOwner: async (input) => { calls.commit.push(input); return { kind: "complete", userId: "local-user", organizationId: "local-org" }; },
    provider: { readAcceptance: async () => evidence, findVerifiedEmails: async () => evidence.verifiedEmails },
    ...overrides,
  };
  return { value, calls };
}

test("initial owner completion uses exact local grant and accepts a verified secondary email", async () => {
  const { completeInitialOwner } = loadTs("src/modules/organizations/customer-provisioning/completion.ts");
  const { value, calls } = dependencies();
  assert.deepEqual(await completeInitialOwner({ instanceId, subject, invitationId: id }, value), { kind: "complete", userId: "local-user", organizationId: "local-org" });
  assert.equal(calls.commit.length, 1);
  assert.equal(calls.commit[0].evidence.subject, subject);
  assert.equal(calls.commit[0].evidence.correlationId, id);
});

test("wrong account, provider organization, correlation, or verified email cannot consume the grant", async () => {
  const { completeInitialOwner } = loadTs("src/modules/organizations/customer-provisioning/completion.ts");
  for (const invalid of [
    { subject: "other-user" },
    { organizationSubject: "other-org" },
    { correlationId: "other-id" },
    { verifiedEmails: ["ada@example.com"] },
    { invitationEmail: "other@example.com" },
    { acceptedAt: new Date("2026-09-09T00:00:00Z") },
  ]) {
    const { value, calls } = dependencies({ provider: { readAcceptance: async () => ({ ...evidence, ...invalid }), findVerifiedEmails: async () => evidence.verifiedEmails } });
    const result = await completeInitialOwner({ instanceId, subject, invitationId: id }, value);
    assert.notEqual(result.kind, "complete");
    assert.equal(calls.commit.length, 0);
  }
});

test("recovery is read-only and includes timely acceptance after local expiry", async () => {
  const { discoverInitialOwnerInvitations } = loadTs("src/modules/organizations/customer-provisioning/completion.ts");
  const { value, calls } = dependencies();
  const found = await discoverInitialOwnerInvitations({ instanceId, subject }, value);
  assert.deepEqual(found, [{ invitationId: id, organizationName: "Acme" }]);
  assert.equal(calls.discover, 1);
  assert.equal(calls.commit.length, 0);
});

test("provider recovery outages remain retryable instead of appearing as no invitations", async () => {
  const { discoverInitialOwnerInvitations } = loadTs("src/modules/organizations/customer-provisioning/completion.ts");
  const { value } = dependencies({ provider: { findVerifiedEmails: async () => { throw new Error("outage"); }, readAcceptance: async () => null } });
  await assert.rejects(discoverInitialOwnerInvitations({ instanceId, subject }, value));
});
