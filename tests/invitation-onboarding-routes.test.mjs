import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const validId = "33333333-3333-4333-8333-333333333333";

test("invitation authentication uses hash routing and returns both flows to the invitation", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/modules/organizations/invitations/components/invitation-auth.tsx", "utf8");
  assert.match(source, /const returnUrl = `\/accept-invitation\?invitation=\$\{encodeURIComponent\(invitationId\)\}`/);
  for (const component of ["SignIn", "SignUp"]) {
    assert.match(source, new RegExp(`<${component}\\s+routing="hash"\\s+forceRedirectUrl=\\{returnUrl\\}`));
  }
});

test("completion action uses the active server subject and writes a user-bound organization cookie only after commit", async () => {
  const { finishInvitationWith } = loadTs("src/modules/organizations/invitations/action-logic.ts");
  const calls = { completion: [], cookies: [] };
  const result = await finishInvitationWith(validId, { subject: "clerk_session_subject", sessionStatus: "active" }, {
    completeInvitation: async (input) => { calls.completion.push(input); return { kind: "complete", userId: "local-user", organizationId: "invited-org" }; },
    setOrganizationSelection: async (selection) => calls.cookies.push(selection),
    instanceId: "ins_test",
  });
  assert.deepEqual(calls.completion, [{ instanceId: "ins_test", subject: "clerk_session_subject", invitationId: validId }]);
  assert.deepEqual(calls.cookies, [{ userId: "local-user", organizationId: "invited-org" }]);
  assert.deepEqual(result, { kind: "complete" });
});

test("signed-out and pending sessions cannot provision, and failures never select an organization", async () => {
  const { finishInvitationWith } = loadTs("src/modules/organizations/invitations/action-logic.ts");
  for (const sessionStatus of ["signed-out", "pending"]) {
    let commits = 0;
    const result = await finishInvitationWith(validId, { subject: "clerk_subject", sessionStatus }, {
      completeInvitation: async () => { commits++; return { kind: "complete", userId: "local", organizationId: "org" }; },
      setOrganizationSelection: async () => assert.fail("must not set a cookie"),
    });
    assert.equal(result.kind, "unavailable");
    assert.equal(commits, 0);
  }
  const failure = await finishInvitationWith(validId, { subject: "clerk_subject", sessionStatus: "active" }, {
    instanceId: "ins_test", completeInvitation: async () => ({ kind: "retry" }), setOrganizationSelection: async () => assert.fail("must not set a cookie"),
  });
  assert.deepEqual(failure, { kind: "retry" });
});

test("invalid invitation locators return safe copy without provider or database calls", async () => {
  const { finishInvitationWith } = loadTs("src/modules/organizations/invitations/action-logic.ts");
  let calls = 0;
  const result = await finishInvitationWith("../../settings/team", { subject: "clerk_subject", sessionStatus: "active" }, {
    completeInvitation: async () => { calls++; return { kind: "complete", userId: "local", organizationId: "org" }; },
    setOrganizationSelection: async () => { calls++; },
  });
  assert.equal(result.kind, "unavailable");
  assert.equal(calls, 0);
});

test("onboarding route inventory keeps only invitation acceptance public", async () => {
  const { readFile } = await import("node:fs/promises");
  const { existsSync } = await import("node:fs");
  assert.equal(existsSync("src/app/accept-invitation/page.tsx"), true);
  assert.equal(existsSync("src/app/onboarding/page.tsx"), true);
  const onboarding = await readFile("src/app/onboarding/page.tsx", "utf8");
  const access = await readFile("src/app/access-required/page.tsx", "utf8");
  assert.match(onboarding, /requireClerkSession/);
  assert.match(access, /requireClerkSession/);
});
