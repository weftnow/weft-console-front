import { createRequire } from "node:module";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as identityTables from "../src/infrastructure/database/schema/identity.ts";
import * as eventTables from "../src/infrastructure/database/schema/events.ts";
import * as invitationTables from "../src/infrastructure/database/schema/organization-invitations.ts";
import * as customerProvisioningTables from "../src/infrastructure/database/schema/customer-provisioning.ts";
import { createCustomerProvisioningRepository } from "../src/modules/organizations/customer-provisioning/repository.ts";
import { createCustomerProvisioningService } from "../src/modules/organizations/customer-provisioning/service.ts";
import { createCustomerProvisioningProvider } from "../src/modules/organizations/customer-provisioning/clerk-provider.ts";
import type { ProviderClient } from "../src/modules/organizations/invitations/clerk-transport.ts";
import { runProvisioningCommand } from "../src/modules/organizations/customer-provisioning/cli.ts";
import { validateProvisioningDatabaseTarget, validateProvisioningEnvironment } from "../src/modules/organizations/customer-provisioning/validation.ts";

const require = createRequire(import.meta.url);

async function main() {
  const argv = process.argv.slice(2);
  const isDryRun = argv[0] === "create" && !argv.includes("--apply");
  if (isDryRun) {
    const result = await runProvisioningCommand(argv, process.env, { service: {
      createCustomer: async (input, options) => ({ requestId: input.requestId, organizationId: null, invitationId: null,
        status: options.apply ? "pending" : "dry-run", providerOrganizationId: null, providerInvitationId: null, cleanupPending: false, errorCode: null }),
      retryCustomer: async () => { throw new Error("retry unavailable"); }, renewOwnerInvitation: async () => { throw new Error("renew unavailable"); },
      cancelCustomer: async () => { throw new Error("cancel unavailable"); }, readCustomerStatus: async () => { throw new Error("status unavailable"); },
    } });
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  const isStatus = argv[0] === "status";
  if (isStatus) validateProvisioningDatabaseTarget(process.env);
  const config = isStatus ? null : validateProvisioningEnvironment(process.env);
  let pool: Pool | undefined;
  try {
    const databaseUrl = process.env.DATABASE_MIGRATION_URL;
    if (!databaseUrl) throw new Error("DATABASE_MIGRATION_URL is required.");
    const parsed = new URL(databaseUrl);
    parsed.searchParams.delete("sslmode");
    pool = new Pool({ connectionString: parsed.toString(), ssl: { rejectUnauthorized: true }, max: 1, connectionTimeoutMillis: 5_000 });
    const database = drizzle({ client: pool, schema: { ...identityTables, ...eventTables, ...invitationTables, ...customerProvisioningTables } });
    const repository = createCustomerProvisioningRepository(database);
    const provider = isStatus ? {
      findOrganization: async () => { throw new Error("Provider is not used by status."); },
      createOrganization: async () => { throw new Error("Provider is not used by status."); },
      findByCorrelation: async () => { throw new Error("Provider is not used by status."); },
      send: async () => { throw new Error("Provider is not used by status."); },
      revoke: async () => { throw new Error("Provider is not used by status."); },
    } : createCustomerProvisioningProvider((require("@clerk/nextjs/server") as { createClerkClient(options: { secretKey: string }): ProviderClient })
      .createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! }));
    const service = createCustomerProvisioningService({ repository, provider, appOrigin: config?.appOrigin ?? "" });
    const result = await runProvisioningCommand(argv, process.env, { service });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool?.end();
  }
}

if (process.argv[1]?.endsWith("provision-customer.ts")) {
  main().catch(() => {
    console.error("Customer provisioning command failed. Check the local status and retry after resolving configuration or provider issues.");
    process.exitCode = 1;
  });
}
