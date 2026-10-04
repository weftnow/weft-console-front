import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const owner = { user: { id: "local-owner" }, organization: { id: "selected-org", name: "Weft Summit" }, membership: { role: "owner" } };
const id = "33333333-3333-4333-8333-333333333333";

function makeDeps(overrides = {}) {
  const calls = { send: [], retry: [], revoke: [] };
  return { calls, value: {
    getContext: async () => owner,
    sendInvitation: async (...args) => { calls.send.push(args); return { kind: "sent", invitation: { id, email: "ada@example.com", role: "organizer", status: "pending", deliveryState: "sent", providerCleanupPending: false, createdAt: "2026-01-01", expiresAt: "2026-01-08" } }; },
    retryInvitationDelivery: async (...args) => { calls.retry.push(args); return { id, email: "ada@example.com", role: "organizer", status: "pending", deliveryState: "unknown", providerCleanupPending: false, createdAt: "2026-01-01", expiresAt: "2026-01-08" }; },
    revokeInvitation: async (...args) => { calls.revoke.push(args); return { id, email: "ada@example.com", role: "organizer", status: "revoked", deliveryState: "sent", providerCleanupPending: true, createdAt: "2026-01-01", expiresAt: "2026-01-08" }; },
    ...overrides,
  } };
}

test("owner action derives selected organization and ignores organization tampering", async () => {
  const { sendTeamInvitationWith } = loadTs("src/modules/organizations/invitations/team-actions.ts");
  const d = makeDeps();
  const input = new FormData();
  input.set("email", "ada@example.com"); input.set("role", "organizer"); input.set("organizationId", "attacker-org"); input.set("userId", "attacker-user");
  const result = await sendTeamInvitationWith(input, d.value);
  assert.equal(result.kind, "sent");
  assert.deepEqual(d.calls.send[0][0], { userId: "local-owner", organizationId: "selected-org" });
  assert.deepEqual(d.calls.send[0][1], { email: "ada@example.com", role: "organizer" });
});

test("organizers are denied direct actions and role tampering never reaches invitation service", async () => {
  const { sendTeamInvitationWith } = loadTs("src/modules/organizations/invitations/team-actions.ts");
  const d = makeDeps({ getContext: async () => ({ ...owner, membership: { role: "organizer" } }) });
  const input = new FormData(); input.set("email", "ada@example.com"); input.set("role", "owner");
  assert.equal((await sendTeamInvitationWith(input, d.value)).kind, "error");
  const invalidRole = makeDeps();
  input.set("role", "staff");
  assert.equal((await sendTeamInvitationWith(input, invalidRole.value)).kind, "error");
  assert.equal(invalidRole.calls.send.length, 0);
});

test("delivery ambiguity is never displayed as sent and duplicate pending send is explicit", async () => {
  const { sendTeamInvitationWith } = loadTs("src/modules/organizations/invitations/team-actions.ts");
  const d = makeDeps({ sendInvitation: async () => ({ kind: "delivery-pending", invitation: { id, email: "ada@example.com", role: "owner", status: "pending", deliveryState: "unknown", providerCleanupPending: false, createdAt: "now", expiresAt: "later" } }) });
  const input = new FormData(); input.set("email", "ada@example.com"); input.set("role", "owner");
  const ambiguous = await sendTeamInvitationWith(input, d.value);
  assert.equal(ambiguous.kind, "delivery-pending");
  assert.doesNotMatch(ambiguous.message, /invitation sent/i);
  const duplicate = makeDeps({ sendInvitation: async () => ({ kind: "existing", invitation: { id, email: "ada@example.com", role: "organizer", status: "pending", deliveryState: "sent", providerCleanupPending: false, createdAt: "now", expiresAt: "later" } }) });
  assert.equal((await sendTeamInvitationWith(input, duplicate.value)).kind, "existing");
});

test("retry and revoke use only invitation ids and show local revocation cleanup state", async () => {
  const { retryTeamInvitationWith, revokeTeamInvitationWith } = loadTs("src/modules/organizations/invitations/team-actions.ts");
  const d = makeDeps();
  const retry = new FormData(); retry.set("invitationId", id); retry.set("organizationId", "attacker");
  assert.equal((await retryTeamInvitationWith(retry, d.value)).kind, "unknown");
  assert.deepEqual(d.calls.retry[0], [{ userId: "local-owner", organizationId: "selected-org" }, id]);
  const revoked = await revokeTeamInvitationWith(retry, d.value);
  assert.equal(revoked.kind, "revoked-cleanup-pending");
  assert.equal(d.calls.revoke.length, 1);
});
