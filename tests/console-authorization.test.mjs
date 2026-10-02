import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { resolveConsoleAccess } = loadTs("@/modules/organizations/console-access");
const member = (id, role = "organizer", active = true, userId = "local-user") => ({
  id: `membership-${id}`, organizationId: id, organizationName: `Org ${id}`, userId, role, active,
});

test("one active owner or organizer membership is selected automatically", () => {
  for (const role of ["owner", "organizer"]) {
    assert.deepEqual(resolveConsoleAccess({ memberships: [member("a", role)], selectedOrganizationId: null }), {
      kind: "ready", membership: member("a", role),
    });
  }
});

test("multiple eligible memberships require a selection and a stale selection does not expose another organization", () => {
  const memberships = [member("a"), member("b")];
  assert.deepEqual(resolveConsoleAccess({ memberships, selectedOrganizationId: null }), { kind: "select" });
  assert.deepEqual(resolveConsoleAccess({ memberships, selectedOrganizationId: "foreign" }), { kind: "select" });
});

test("a single organizer membership among several active roles still requires an organization choice", () => {
  assert.deepEqual(resolveConsoleAccess({ memberships: [member("owner"), member("staff", "staff")], selectedOrganizationId: null }), { kind: "select" });
});

test("no membership and unsupported roles cannot enter organizer Console", () => {
  for (const memberships of [[], [member("inactive", "owner", false)], [member("staff", "staff")], [member("sponsor", "sponsor")]]) {
    assert.deepEqual(resolveConsoleAccess({ memberships, selectedOrganizationId: null }), { kind: "no-access" });
  }
});

test("selected organizations are resolved only from active memberships", () => {
  const own = member("own", "organizer", true);
  const forged = member("foreign", "owner", true, "another-user");
  assert.deepEqual(resolveConsoleAccess({ memberships: [own, forged], selectedOrganizationId: "foreign", userId: "local-user" }), { kind: "select" });
  assert.deepEqual(resolveConsoleAccess({ memberships: [own, member("revoked", "owner", false)], selectedOrganizationId: "revoked", userId: "local-user" }), { kind: "select" });
});

test("selector and access-required routes check Clerk directly", async () => {
  const fs = await import("node:fs");
  const selector = fs.readFileSync(new URL("../src/app/select-organization/page.tsx", import.meta.url), "utf8");
  const access = fs.readFileSync(new URL("../src/app/access-required/page.tsx", import.meta.url), "utf8");
  assert.match(selector, /requireClerkSession\(/);
  assert.match(access, /requireClerkSession\(/);
});
