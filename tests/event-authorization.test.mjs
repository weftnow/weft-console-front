import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";

test("only active owner and organizer memberships can create", async () => {
  const { requireEventCreator } = loadTs("src/modules/organizations/service.ts");
  for (const role of ["owner", "organizer", "staff", "sponsor"]) {
    const repo = { findMembership: async () => ({ id: userId, userId, organizationId, role, active: true }) };
    if (["owner", "organizer"].includes(role)) {
      assert.equal((await requireEventCreator({ userId, organizationId }, repo)).id, organizationId);
    } else {
      await assert.rejects(requireEventCreator({ userId, organizationId }, repo), (error) => error.code === "FORBIDDEN");
    }
  }
  await assert.rejects(requireEventCreator({ userId, organizationId }, { findMembership: async () => null }), (error) => error.code === "FORBIDDEN");
  await assert.rejects(requireEventCreator({ userId, organizationId }, { findMembership: async () => ({ id: userId, userId, organizationId, role: "owner", active: false }) }), (error) => error.code === "FORBIDDEN");
});
