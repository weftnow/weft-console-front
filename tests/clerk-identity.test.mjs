import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";
test("identity schema defines the instance scoped mapping with uniqueness and disabled state", async () => {
  const { readFileSync } = await import("node:fs");
  const schema = readFileSync(new URL("../src/infrastructure/database/schema/identity.ts", import.meta.url), "utf8");
  assert.match(schema, /userAuthIdentities/);
  assert.match(schema, /identity_provider_instance_subject_unique/);
  assert.match(schema, /identity_user_provider_instance_unique/);
  assert.match(schema, /disabled_at/);
});

test("provisioning parser requires explicit nonproduction target and exclusive linking mode", async () => {
  const { parseArgs } = loadTs("../scripts/provision-clerk-user.ts", new URL("../tests/", import.meta.url));
  assert.deepEqual(parseArgs(["--instance-id", "ins_dev", "--clerk-user-id", "user_12345678", "--local-user-id", "5f750edf-c8d5-43c2-b3ca-5f0ab190405f"]), {
    instanceId: "ins_dev", clerkUserId: "user_12345678", localUserId: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f",
  });
  assert.deepEqual(parseArgs(["--instance-id", "ins_dev", "--clerk-user-id", "user_12345678", "--display-name", "Organizer", "--avatar-url", "https://example.com/avatar.png"]), {
    instanceId: "ins_dev", clerkUserId: "user_12345678", displayName: "Organizer", avatarUrl: "https://example.com/avatar.png",
  });
  assert.throws(() => parseArgs(["--instance-id", "ins_dev", "--clerk-user-id", "user_12345678", "--local-user-id", "bad", "--display-name", "Name"]));
  assert.throws(() => parseArgs(["--instance-id", "ins_dev", "--clerk-user-id", "bad", "--display-name", "Name"]));
});

test("current user adapter is request memoized and only resolves the server session", async () => {
  const source = (await import("node:fs")).readFileSync(new URL("../src/infrastructure/auth/current-user.ts", import.meta.url), "utf8");
  assert.match(source, /auth\(\)/);
  assert.match(source, /cache\(/);
  assert.match(source, /resolveCurrentUser/);
  assert.doesNotMatch(source, /headers\(\)|searchParams|request\.body/);
});
