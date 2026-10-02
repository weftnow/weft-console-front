import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { resolveCurrentUser } = loadTs("@/infrastructure/auth/resolve-current-user");

test("signed out and pending sessions never query Neon", async () => {
  let calls = 0;
  const findUser = async () => { calls += 1; return null; };
  assert.equal(await resolveCurrentUser({ readSession: async () => null, instanceId: "ins_dev", findUser }), null);
  assert.equal(calls, 0);
});

test("verified subject resolves only through an enabled instance mapping", async () => {
  const actor = { id: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f", displayName: "Organizer", avatarUrl: null };
  let input;
  const result = await resolveCurrentUser({
    readSession: async () => ({ subject: "user_clerk_123" }), instanceId: "ins_dev",
    findUser: async (value) => { input = value; return actor; },
  });
  assert.deepEqual(input, { instanceId: "ins_dev", subject: "user_clerk_123" });
  assert.deepEqual(result, actor);
});

test("missing mapping returns a controlled forbidden error", async () => {
  await assert.rejects(resolveCurrentUser({
    readSession: async () => ({ subject: "user_unmapped" }), instanceId: "ins_dev", findUser: async () => null,
  }), (error) => error.code === "FORBIDDEN");
});

test("missing instance config and repository outages fail closed", async () => {
  await assert.rejects(resolveCurrentUser({ readSession: async () => ({ subject: "user_123" }), instanceId: undefined, findUser: async () => null }));
  await assert.rejects(resolveCurrentUser({ readSession: async () => ({ subject: "user_123" }), instanceId: "ins_dev", findUser: async () => { throw new Error("db unavailable"); } }), /db unavailable/);
});
