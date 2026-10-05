import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const id = "44444444-4444-4444-8444-444444444444";

function deps(overrides = {}) {
  const calls = [];
  return { calls, value: {
    instanceId: "ins_test",
    findTeamInvitation: async () => null,
    findOwnerInvitation: async () => ({ id }),
    completeTeamInvitation: async (input) => { calls.push(["team", input]); return { kind: "complete", userId: "local", organizationId: "team-org" }; },
    completeInitialOwner: async (input) => { calls.push(["owner", input]); return { kind: "complete", userId: "local", organizationId: "owner-org" }; },
    discoverTeamInvitations: async () => [], discoverInitialOwnerInvitations: async () => [],
    ...overrides,
  } };
}

test("dispatcher completes bootstrap from server session subject and local invitation ID only", async () => {
  const { completeConsoleInvitation } = loadTs("src/modules/organizations/invitations/admission.ts");
  const { value, calls } = deps();
  const result = await completeConsoleInvitation({ instanceId: "ins_test", subject: "session-subject", invitationId: id }, value);
  assert.equal(result.organizationId, "owner-org");
  assert.deepEqual(calls, [["owner", { instanceId: "ins_test", subject: "session-subject", invitationId: id }]]);
});

test("team invitations dispatch only to the existing active-owner-protected completion path", async () => {
  const { completeConsoleInvitation } = loadTs("src/modules/organizations/invitations/admission.ts");
  const { value, calls } = deps({ findTeamInvitation: async () => ({ id }), findOwnerInvitation: async () => null,
    completeTeamInvitation: async () => ({ kind: "conflict" }) });
  assert.deepEqual(await completeConsoleInvitation({ instanceId: "ins_test", subject: "session", invitationId: id }, value), { kind: "conflict" });
  assert.equal(calls.length, 0);
});

test("ambiguous invitation UUIDs deny completion without choosing a ledger", async () => {
  const { completeConsoleInvitation } = loadTs("src/modules/organizations/invitations/admission.ts");
  const { value, calls } = deps({ findTeamInvitation: async () => ({ id }) });
  assert.deepEqual(await completeConsoleInvitation({ instanceId: "ins_test", subject: "session", invitationId: id }, value), { kind: "conflict" });
  assert.equal(calls.length, 0);
});

test("combined discovery is read-only and retains temporary provider failures", async () => {
  const { discoverConsoleInvitations } = loadTs("src/modules/organizations/invitations/admission.ts");
  const { value } = deps({ discoverTeamInvitations: async () => [{ invitationId: "team", organizationName: "Team Org" }],
    discoverInitialOwnerInvitations: async () => [{ invitationId: "owner", organizationName: "Owner Org" }] });
  assert.deepEqual(await discoverConsoleInvitations({ instanceId: "ins_test", subject: "session" }, value), [
    { invitationId: "team", organizationName: "Team Org" }, { invitationId: "owner", organizationName: "Owner Org" },
  ]);
  await assert.rejects(discoverConsoleInvitations({ instanceId: "ins_test", subject: "session" }, deps({
    discoverTeamInvitations: async () => { throw new Error("temporary provider outage"); },
  }).value));
});
