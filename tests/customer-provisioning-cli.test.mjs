import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const uuid = "33333333-3333-4333-8333-333333333333";
const production = {
  WEFT_PROVISION_TARGET: "production",
  DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require",
  CLERK_SECRET_KEY: "sk_live_fixture",
  WEFT_CLERK_INSTANCE_ID: "ins_production",
  WEFT_APP_ORIGIN: "https://console.example.com",
  WEFT_PROVISION_OPERATOR: "ops@example.com",
};
const development = {
  ...production,
  WEFT_PROVISION_TARGET: "test",
  DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-test.neon.tech/weft_console_test?sslmode=require",
  CLERK_SECRET_KEY: "sk_test_fixture",
  WEFT_CLERK_INSTANCE_ID: "ins_test",
  WEFT_APP_ORIGIN: "http://localhost:3000",
};

function createServiceSpy() {
  const calls = [];
  const service = Object.fromEntries(["createCustomer", "retryCustomer", "renewOwnerInvitation", "cancelCustomer", "readCustomerStatus"]
    .map((method) => [method, async (...args) => { calls.push([method, ...args]); return { method }; }]));
  return { calls, service };
}

test("create defaults to an input-only dry-run without requiring provisioning credentials", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const calls = [];
  const service = { createCustomer: async (...args) => { calls.push(args); return { status: args[1].apply ? "sent" : "dry-run" }; } };
  const result = await runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "  Acme  ", "--owner-email", " Ada@Example.com "], {}, { service });
  assert.equal(result.status, "dry-run");
  assert.deepEqual(calls[0][0], { requestId: uuid, organizationName: "Acme", ownerEmail: "ada@example.com", instanceId: "dry-run", operator: "dry-run" });
  assert.deepEqual(calls[0][1], { apply: false, sendInvitation: false });
});

test("all mutations require their explicit apply and invitation flags", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const { service } = createServiceSpy();
  const create = ["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com"];
  for (const env of [production, development]) {
    await assert.rejects(runProvisioningCommand([...create, "--apply"], env, { service }), /--send-invitation/i);
    await assert.rejects(runProvisioningCommand([...create, "--send-invitation"], env, { service }), /--apply/i);
    await assert.rejects(runProvisioningCommand(["retry", "--request-id", uuid, "--apply"], env, { service }), /--send-invitation/i);
    await assert.rejects(runProvisioningCommand(["renew", "--request-id", uuid, "--send-invitation"], env, { service }), /--apply/i);
    await assert.rejects(runProvisioningCommand(["cancel", "--request-id", uuid], env, { service }), /--apply/i);
    await assert.rejects(runProvisioningCommand(["status", "--request-id", uuid, "--apply"], env, { service }), /read-only/i);
  }
});

test("production create dispatches normalized immutable Owner input once after validation", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const { calls, service } = createServiceSpy();
  await runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "  Acme Summit ", "--owner-email", " Ada+events@Example.com ", "--apply", "--send-invitation"], production, { service });
  assert.deepEqual(calls, [["createCustomer", {
    requestId: uuid,
    organizationName: "Acme Summit",
    ownerEmail: "ada+events@example.com",
    instanceId: "ins_production",
    operator: "ops@example.com",
  }, { apply: true, sendInvitation: true }]]);
});

test("production retry, renew, and cancel dispatch once with the configured instance", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  for (const [command, method, flags] of [
    ["retry", "retryCustomer", ["--apply", "--send-invitation"]],
    ["renew", "renewOwnerInvitation", ["--apply", "--send-invitation"]],
    ["cancel", "cancelCustomer", ["--apply"]],
  ]) {
    const { calls, service } = createServiceSpy();
    await runProvisioningCommand([command, "--request-id", uuid, ...flags], production, { service });
    assert.deepEqual(calls, [[method, uuid, "ins_production"]]);
  }
});

test("invalid and crossed environment settings prevent every mutation and never expose credentials", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const mutations = [
    ["create", ["--organization-name", "Acme", "--owner-email", "ada@example.com", "--apply", "--send-invitation"]],
    ["retry", ["--apply", "--send-invitation"]],
    ["renew", ["--apply", "--send-invitation"]],
    ["cancel", ["--apply"]],
  ];
  const invalidEnvironments = [
    { ...production, CLERK_SECRET_KEY: "sk_test_sensitive_fixture" },
    { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console_test?sslmode=require" },
    { ...production, WEFT_PROVISION_TARGET: "development", DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-development.neon.tech/weft_console_test?sslmode=require", CLERK_SECRET_KEY: "sk_live_sensitive_fixture" },
  ];
  for (const env of invalidEnvironments) {
    for (const [command, flags] of mutations) {
      const { calls, service } = createServiceSpy();
      const args = command === "create" ? [command, "--request-id", uuid, ...flags] : [command, "--request-id", uuid, ...flags];
      await assert.rejects(runProvisioningCommand(args, env, { service }), (error) => {
        assert.equal(typeof error.message, "string");
        assert.equal(error.message.includes("sensitive_fixture"), false);
        return true;
      });
      assert.deepEqual(calls, [], `${command} must reject before service calls`);
    }
  }
});

test("production status validates only database and instance and remains read-only", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  const env = {
    WEFT_PROVISION_TARGET: "production",
    DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL,
    WEFT_CLERK_INSTANCE_ID: "ins_production",
  };
  const { calls, service } = createServiceSpy();
  const result = await runProvisioningCommand(["status", "--request-id", uuid], env, { service });
  assert.deepEqual(calls, [["readCustomerStatus", uuid, "ins_production"]]);
  assert.deepEqual(result, { method: "readCustomerStatus" });
  await assert.rejects(runProvisioningCommand(["status", "--request-id", uuid], {
    ...env,
    DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console_test?sslmode=require",
  }, { service }), /DATABASE_MIGRATION_URL/i);
  await assert.rejects(runProvisioningCommand(["status", "--request-id", uuid, "--apply"], env, { service }), /read-only/i);
});

test("CLI rejects unknown flags and conflicting immutable role input", async () => {
  const { runProvisioningCommand } = loadTs("src/modules/organizations/customer-provisioning/cli.ts");
  await assert.rejects(runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--role", "organizer"], {}, { service: {} }), /unknown argument/i);
  await assert.rejects(runProvisioningCommand(["create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--apply", "--send-invitation"], {
    WEFT_PROVISION_TARGET: "test", DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep.example.neon.tech/weft_console?sslmode=require", CLERK_SECRET_KEY: "sk_test_fixture", WEFT_CLERK_INSTANCE_ID: "ins_test", WEFT_APP_ORIGIN: "https://console.example.com", WEFT_PROVISION_OPERATOR: "ops@example.com",
  }, { service: {} }), /weft_console_test/i);
});

test("direct Node invocation fails safely on an invalid production target before connecting", () => {
  const env = {
    ...process.env,
    WEFT_PROVISION_TARGET: "production",
    DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console_test?sslmode=require",
    CLERK_SECRET_KEY: "sk_live_synthetic_fixture",
    WEFT_CLERK_INSTANCE_ID: "ins_synthetic_production",
    WEFT_APP_ORIGIN: "https://console.example.com",
    WEFT_PROVISION_OPERATOR: "synthetic-ops@example.com",
  };
  delete env.NODE_OPTIONS;
  const result = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--experimental-strip-types", "scripts/provision-customer.ts",
    "create", "--request-id", uuid, "--organization-name", "Acme", "--owner-email", "ada@example.com", "--apply", "--send-invitation"], { encoding: "utf8", env });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Customer provisioning command failed\. Check the local status and retry after resolving configuration or provider issues\./);
  assert.equal(result.stderr.includes("synthetic"), false);
});

test("package dry-run stays input-only under the production target without credentials", () => {
  const env = { ...process.env, WEFT_PROVISION_TARGET: "production" };
  delete env.NODE_OPTIONS;
  for (const name of ["DATABASE_MIGRATION_URL", "CLERK_SECRET_KEY", "WEFT_CLERK_INSTANCE_ID", "WEFT_APP_ORIGIN", "WEFT_PROVISION_OPERATOR"]) delete env[name];
  const output = execFileSync("pnpm", ["run", "--silent", "provision:customer", "create", "--request-id", uuid,
    "--organization-name", "Acme", "--owner-email", "ada@example.com"], { encoding: "utf8", env });
  const result = JSON.parse(output);
  assert.equal(result.status, "dry-run");
  assert.equal(result.organizationId, null);
  assert.equal(result.providerOrganizationId, null);
  assert.equal(result.invitationId, null);
  assert.equal(result.providerInvitationId, null);
});
