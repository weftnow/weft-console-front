import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const invitationId = "33333333-3333-4333-8333-333333333333";
const subject = "user_invited";
const record = { id: invitationId, organizationId: "org_local", instanceId: "ins_test", email: "ada+team@example.com", role: "organizer", status: "pending" };
const evidence = { subject, organizationSubject: "org_clerk", membershipId: "mem_1", correlationId: invitationId,
  invitationEmail: "ada+team@example.com", acceptedAt: new Date("2026-01-03T00:00:00Z"), verifiedEmails: ["primary@example.com", "ada+team@example.com"], displayName: "Ada Lovelace", avatarUrl: null };

function deps(overrides = {}) {
  const calls = { commit: [], provider: [], candidates: 0 };
  return { calls, value: {
    instanceId: "ins_test", findInvitation: async () => record,
    findOrganizationIdentity: async () => ({ organizationSubject: "org_clerk" }),
    provider: { readAcceptance: async (...args) => { calls.provider.push(args); return evidence; }, findVerifiedEmails: async () => evidence.verifiedEmails },
    commitAdmission: async (input) => { calls.commit.push(input); return { kind: "complete", userId: "local-user", organizationId: "org_local" }; },
    listInvitationCandidates: async () => { calls.candidates++; return [{ invitationId, email: record.email, organizationName: "Weft Summit", organizationSubject: "org_clerk" }]; },
    ...overrides,
  } };
}

test("completion verifies exact instance, subject, organization, correlation and secondary verified email", async () => {
  const { completeInvitation } = loadTs("src/modules/organizations/invitations/completion.ts");
  const d = deps();
  assert.deepEqual(await completeInvitation({ instanceId: "ins_test", subject, invitationId }, d.value), { kind: "complete", userId: "local-user", organizationId: "org_local" });
  assert.equal(d.calls.provider[0][0], "org_clerk");
  assert.equal(d.calls.commit.length, 1);
});

test("wrong account, forged correlation, provider organization and email create no admission", async () => {
  const { completeInvitation } = loadTs("src/modules/organizations/invitations/completion.ts");
  for (const invalid of [
    { evidence: { ...evidence, subject: "someone_else" } },
    { evidence: { ...evidence, correlationId: "other_invitation" } },
    { evidence: { ...evidence, organizationSubject: "other_org" } },
    { evidence: { ...evidence, verifiedEmails: ["ada@example.com"] } },
    { evidence: { ...evidence, invitationEmail: "other@example.com" } },
    { record: { ...record, instanceId: "ins_other" } },
  ]) {
    const d = deps({
      ...(invalid.record ? { findInvitation: async () => invalid.record } : {}),
      ...(invalid.evidence ? { provider: { ...deps().value.provider, readAcceptance: async () => invalid.evidence } } : {}),
    });
    const result = await completeInvitation({ instanceId: "ins_test", subject, invitationId }, d.value);
    assert.notEqual(result.kind, "complete");
    assert.equal(d.calls.commit.length, 0);
  }
});

test("repeated completion relies on idempotent transaction and never provisions from a bare account", async () => {
  const { completeInvitation } = loadTs("src/modules/organizations/invitations/completion.ts");
  let admissions = 0;
  const d = deps({ commitAdmission: async () => { admissions++; return { kind: "complete", userId: "same-local-id", organizationId: "org_local" }; } });
  const first = await completeInvitation({ instanceId: "ins_test", subject, invitationId }, d.value);
  const replay = await completeInvitation({ instanceId: "ins_test", subject, invitationId }, d.value);
  assert.deepEqual(first, replay);
  assert.equal(admissions, 2); // The database transaction returns the already committed membership on replay.
  const bare = deps({ provider: { ...d.value.provider, readAcceptance: async () => null } });
  assert.equal((await completeInvitation({ instanceId: "ins_test", subject, invitationId }, bare.value)).kind, "unavailable");
  assert.equal(bare.calls.commit.length, 0);
});

test("recovery discovery is read only and returns only exact provider evidence", async () => {
  const { discoverAcceptedInvitations } = loadTs("src/modules/organizations/invitations/completion.ts");
  const d = deps();
  const result = await discoverAcceptedInvitations({ instanceId: "ins_test", subject }, d.value);
  assert.deepEqual(result, [{ invitationId, organizationName: "Weft Summit" }]);
  assert.equal(d.calls.commit.length, 0);
  assert.equal(d.calls.candidates, 1);
});

test("temporary provider discovery failures propagate so recovery can show a retry state", async () => {
  const { discoverAcceptedInvitations } = loadTs("src/modules/organizations/invitations/completion.ts");
  const d = deps({ provider: { ...deps().value.provider, findVerifiedEmails: async () => { throw new Error("temporary outage"); } } });
  await assert.rejects(discoverAcceptedInvitations({ instanceId: "ins_test", subject }, d.value));
});
