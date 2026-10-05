import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const validRequestId = "33333333-3333-4333-8333-333333333333";

test("customer provisioning input normalizes only surrounding whitespace and case", () => {
  const { parseCustomerRequest, validateProvisioningEnvironment } = loadTs("src/modules/organizations/customer-provisioning/validation.ts");
  const parsed = parseCustomerRequest({ requestId: validRequestId, organizationName: "  Acme, Inc.  ", ownerEmail: "  Ada+events@Example.com ", operator: "ops@example.com", instanceId: "ins_test" });
  assert.equal(parsed.organizationName, "Acme, Inc.");
  assert.equal(parsed.ownerEmail, "ada+events@example.com");
  assert.equal(parsed.requestId, validRequestId);
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: " ", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: "bad", organizationName: "Acme", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "x".repeat(201), ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "Acme", ownerEmail: "not-an-email", operator: "ops", instanceId: "ins_test" }));
  assert.throws(() => parseCustomerRequest({ requestId: validRequestId, organizationName: "Acme", ownerEmail: "ada@example.com", operator: "ops", instanceId: "ins_test", role: "owner" }));
  assert.throws(() => validateProvisioningEnvironment({ WEFT_PROVISION_TARGET: "production" }));
  assert.throws(() => validateProvisioningEnvironment({ WEFT_PROVISION_TARGET: "test", DATABASE_MIGRATION_URL: "postgres://localhost/weft_console_test", CLERK_SECRET_KEY: "sk_test", WEFT_CLERK_INSTANCE_ID: "ins_test", WEFT_APP_ORIGIN: "https://console.example.com", WEFT_PROVISION_OPERATOR: "ops", instanceId: "ins_other" }));
});
