import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

function invitation(id, correlationId, status = "pending") {
  return { id, organizationId: "org_exact", emailAddress: "ada@example.com", status, createdAt: 1000, publicMetadata: correlationId ? { weftInvitationId: correlationId } : {} };
}

test("Clerk transport sends member role, seven day expiry and only the local correlation", async () => {
  const { createClerkInvitationProvider } = loadTs("src/modules/organizations/invitations/clerk-provider.ts");
  let payload;
  const client = { organizations: { createOrganizationInvitation: async (input) => { payload = input; return invitation("inv_1", input.publicMetadata.weftInvitationId); } } };
  const provider = createClerkInvitationProvider(client);
  const sent = await provider.send({ organizationSubject: "org_exact", email: "ada@example.com", correlationId: "local-uuid", redirectUrl: "https://console.example.com/accept-invitation?invitation=local-uuid" });
  assert.equal(payload.role, "org:member");
  assert.equal(payload.expiresInDays, 7);
  assert.deepEqual(payload.publicMetadata, { weftInvitationId: "local-uuid" });
  assert.equal(payload.inviterUserId, undefined);
  assert.equal(payload.redirectUrl, "https://console.example.com/accept-invitation?invitation=local-uuid");
  assert.equal(sent.correlationId, "local-uuid");
});

test("correlation lookup paginates and rejects multiple provider matches", async () => {
  const { createClerkInvitationProvider } = loadTs("src/modules/organizations/invitations/clerk-provider.ts");
  const offsets = [];
  const provider = createClerkInvitationProvider({ organizations: {
    getOrganizationInvitationList: async ({ offset }) => { offsets.push(offset); return offset === 0
      ? { data: [invitation("first", "other")], totalCount: 101 }
      : { data: [invitation("found", "local")], totalCount: 101 }; },
  } });
  assert.equal((await provider.findByCorrelation("org_exact", "local")).id, "found");
  assert.deepEqual(offsets, [0, 100]);
});

test("acceptance requires exact invitation correlation, organization and public user id", async () => {
  const { createClerkInvitationProvider } = loadTs("src/modules/organizations/invitations/clerk-provider.ts");
  let userIds;
  let invitationRow = invitation("inv_1", "local", "accepted");
  let membership = { id: "mem_1", organization: { id: "org_exact" }, createdAt: 2000,
    publicMetadata: { weftInvitationId: "local" }, publicUserData: { userId: "user_exact" } };
  const provider = createClerkInvitationProvider({ organizations: {
    getOrganizationInvitationList: async () => ({ data: [invitationRow], totalCount: 1 }),
    getOrganizationMembershipList: async (input) => { userIds = input.userId; return { data: [membership], totalCount: 1 }; },
  }, users: { getUser: async () => ({ id: "user_exact", fullName: "Ada Lovelace", imageUrl: null,
    emailAddresses: [{ emailAddress: "ada@example.com", verification: { status: "verified" } }] }) } });
  assert.equal((await provider.readAcceptance("org_exact", "user_exact", "local")).subject, "user_exact");
  assert.equal((await provider.readAcceptance("org_exact", "user_exact", "local")).invitationEmail, "ada@example.com");
  assert.deepEqual(userIds, ["user_exact"]);
  membership = { ...membership, publicUserData: { userId: "different_user" } };
  assert.equal(await provider.readAcceptance("org_exact", "user_exact", "local"), null);
  invitationRow = invitation("inv_1", "other", "accepted");
  assert.equal(await provider.readAcceptance("org_exact", "user_exact", "local"), null);
});

test("provider errors expose sanitized codes and classify throttling as retryable", async () => {
  const { createClerkInvitationProvider } = loadTs("src/modules/organizations/invitations/clerk-provider.ts");
  const provider = createClerkInvitationProvider({ organizations: {
    createOrganizationInvitation: async () => { throw Object.assign(new Error("secret response body"), { status: 429, errors: [{ message: "secret" }] }); },
  } });
  await assert.rejects(provider.send({ organizationSubject: "org_exact", email: "ada@example.com", correlationId: "local", redirectUrl: "https://console.example.com/accept-invitation?invitation=local" }), (error) => {
    assert.equal(error.code, "provider_rate_limited");
    assert.equal(error.retryable, true);
    assert.equal(error.message.includes("secret"), false);
    return true;
  });
});
