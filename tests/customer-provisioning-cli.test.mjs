import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const uuid = "33333333-3333-4333-8333-333333333333";

test("create defaults to a dry-run and sends no invitation without apply", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const calls = [];
  const service = { createCustomer: async (...args) => { calls.push(args); return { status: args[1].apply ? "sent" : "dry-run" }; } };
  const result = await runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com"], {}, { service });
  assert.equal(result.status, "dry-run");
  assert.equal(calls[0][1].apply, false);
  assert.equal(calls[0][1].sendInvitation, false);
});

test("mutating create requires explicit apply, invitation delivery, and a guarded target", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const service = { createCustomer: async (_input, options) => ({ status: options.apply ? "sent" : "dry-run" }) };
  const args = ["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--apply"];
  await assert.rejects(runProvisioningCommand(args, {}, { service }), /--send-invitation/i);
  await assert.rejects(runProvisioningCommand([...args, "--send-invitation"], { WEFT_PROVISION_TARGET: "production" }, { service }), /WEFT_PROVISION_TARGET/i);
});

test("CLI rejects unknown flags and conflicting immutable role input", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  await assert.rejects(runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--role", "organizer"], {}, { service: {} }), /unknown argument/i);
  await assert.rejects(runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--apply", "--send-invitation"], {
    WEFT_PROVISION_TARGET: "test", DATABASE_MIGRATION_URL: "postgres://test:test@ep.example.neon.tech/weft_console?sslmode=require", CLERK_SECRET_KEY: "sk_test", WEFT_CLERK_INSTANCE_ID: "ins_test", WEFT_APP_ORIGIN: "https://console.example.com", WEFT_PROVISION_OPERATOR: "ops@example.com",
  }, { service: {} }), /weft_console_test/i);
});

test("package CLI dry-run executes without starting Next or opening database connections", () => {
  const output = execFileSync("pnpm", ["run", "--silent", "provision:customer", "create", "--request-id", uuid,
    "--organization-name", "Acme", "--owner-email", "ada@example.com"], { encoding: "utf8" });
  assert.equal(JSON.parse(output).status, "dry-run");
});
