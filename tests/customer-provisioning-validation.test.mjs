import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const validRequestId = "33333333-3333-4333-8333-333333333333";
const production = {
  WEFT_PROVISION_TARGET: "production",
  DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require",
  CLERK_SECRET_KEY: "sk_live_fixture",
  WEFT_CLERK_INSTANCE_ID: "ins_production",
  WEFT_APP_ORIGIN: "https://console.example.com",
  WEFT_PROVISION_OPERATOR: "ops@example.com",
};

const development = {
  WEFT_PROVISION_TARGET: "development",
  DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-development.neon.tech/weft_console_test?sslmode=require",
  CLERK_SECRET_KEY: "sk_test_fixture",
  WEFT_CLERK_INSTANCE_ID: "ins_development",
  WEFT_APP_ORIGIN: "http://localhost:3000",
  WEFT_PROVISION_OPERATOR: "ops@example.com",
};

test("customer provisioning input normalizes only surrounding whitespace and case", () => {
  const { parseCustomerRequest } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  const parsed = parseCustomerRequest({ requestId: validRequestId, organizationName: "  Acme, Inc.  ", ownerEmail: "  Ada+events@Example.com ", operator: "ops@example.com", instanceId: "ins_test" });
  assert.equal(parsed.organizationName, "Acme, Inc.");
  assert.equal(parsed.ownerEmail, "ada+events@example.com");
  assert.equal(parsed.requestId, validRequestId);
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: " ", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: "bad", organizationName: "Acme", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "x".repeat(201), ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "Acme", ownerEmail: "not-an-email", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "Acme", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test", role: "owner" }));
});

test("production target accepts only the explicit live configuration and preserves its shape", () => {
  const { validateProvisioningDatabaseTarget, validateProvisioningEnvironment } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  assert.deepEqual(validateProvisioningDatabaseTarget(production), { databaseUrl: production.DATABASE_MIGRATION_URL });
  assert.deepEqual(validateProvisioningEnvironment(production), {
    databaseUrl: production.DATABASE_MIGRATION_URL,
    instanceId: "ins_production",
    appOrigin: "https://console.example.com",
    operator: "ops@example.com",
  });
});

test("development and test targets remain scoped to the test database and support local origins", () => {
  const { validateProvisioningDatabaseTarget, validateProvisioningEnvironment } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  for (const target of ["development", "test"]) {
    const env = { ...development, WEFT_PROVISION_TARGET: target };
    assert.deepEqual(validateProvisioningDatabaseTarget(env), { databaseUrl: env.DATABASE_MIGRATION_URL });
    assert.deepEqual(validateProvisioningEnvironment(env).appOrigin, "http://localhost:3000");
  }
});

test("database target rejects missing, unknown, crossed, and unsafe PostgreSQL settings", () => {
  const { validateProvisioningDatabaseTarget } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  const invalid = [
    ["missing target", { ...production, WEFT_PROVISION_TARGET: undefined }],
    ["unknown target", { ...production, WEFT_PROVISION_TARGET: "staging" }],
    ["production with test database", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console_test?sslmode=require" }],
    ["development with production database", { ...development, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-development.neon.tech/weft_console?sslmode=require" }],
    ["non-Neon hostname", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@db.example.com/weft_console?sslmode=require" }],
    ["pooled production hostname", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production-pooler.neon.tech/weft_console?sslmode=require" }],
    ["unsupported protocol", { ...production, DATABASE_MIGRATION_URL: "mysql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require" }],
    ["missing TLS mode", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console" }],
    ["disabled TLS", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=disable" }],
    ["unsupported TLS mode", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=allow" }],
    ["unsupported query parameter", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require&connect_timeout=5" }],
    ["repeated query parameter", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require&sslmode=verify-full" }],
    ["encoded database path", { ...production, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-production.neon.tech/%77eft_console_test?sslmode=require" }],
    ...["host=other", "dbname=other", "options=-csearch_path=public", "ssl=false"].map((query) => ["forbidden " + query.split("=")[0] + " parameter", { ...production, DATABASE_MIGRATION_URL: `postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require&${query}` }]),
  ];
  for (const [name, env] of invalid) assert.throws(() => validateProvisioningDatabaseTarget(env), name);
  for (const sslmode of ["require", "verify-ca", "verify-full"]) {
    const env = { ...production, DATABASE_MIGRATION_URL: `postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=${sslmode}` };
    assert.deepEqual(validateProvisioningDatabaseTarget(env), { databaseUrl: env.DATABASE_MIGRATION_URL });
  }
  const devTls = { ...development, DATABASE_MIGRATION_URL: "postgresql://fixture:fixture@ep-test.neon.tech/weft_console_test?sslmode=verify-full" };
  assert.deepEqual(validateProvisioningDatabaseTarget(devTls), { databaseUrl: devTls.DATABASE_MIGRATION_URL });
});

test("full environment rejects crossed credentials, missing audit configuration, and noncanonical production origins", () => {
  const { validateProvisioningEnvironment } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  const invalid = [
    ["production with test key", { ...production, CLERK_SECRET_KEY: "sk_test_fixture" }],
    ["production key without live prefix", { ...production, CLERK_SECRET_KEY: "fixture" }],
    ["production key without live suffix", { ...production, CLERK_SECRET_KEY: "sk_live_" }],
    ["development with live key", { ...development, CLERK_SECRET_KEY: "sk_live_fixture" }],
    ["missing instance", { ...production, WEFT_CLERK_INSTANCE_ID: undefined }],
    ["missing operator", { ...production, WEFT_PROVISION_OPERATOR: undefined }],
    ["mismatched explicit instance", { ...production, instanceId: "ins_other" }],
    ["production HTTP origin", { ...production, WEFT_APP_ORIGIN: "http://console.example.com" }],
    ["production loopback origin", { ...production, WEFT_APP_ORIGIN: "https://127.0.0.1" }],
    ["production IPv6 loopback origin", { ...production, WEFT_APP_ORIGIN: "https://[::1]" }],
    ["production localhost with trailing dot", { ...production, WEFT_APP_ORIGIN: "https://localhost." }],
    ["origin credentials", { ...production, WEFT_APP_ORIGIN: "https://fixture:secret@console.example.com" }],
    ["origin path", { ...production, WEFT_APP_ORIGIN: "https://console.example.com/path" }],
    ["origin query", { ...production, WEFT_APP_ORIGIN: "https://console.example.com?debug=true" }],
    ["origin fragment", { ...production, WEFT_APP_ORIGIN: "https://console.example.com#section" }],
    ["development with production database", { ...development, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL }],
  ];
  for (const [name, env] of invalid) assert.throws(() => validateProvisioningEnvironment(env), name);
  assert.deepEqual(validateProvisioningEnvironment(development).appOrigin, "http://localhost:3000");
});
