import { z } from "zod";

const customerRequestSchema = z.strictObject({
  requestId: z.uuid(),
  organizationName: z.string().trim().min(1).max(200),
  ownerEmail: z.string().trim().max(254).email().transform((email) => email.toLowerCase()),
  instanceId: z.string().trim().min(1),
  operator: z.string().trim().min(1).max(120),
});

export type CustomerRequest = z.infer<typeof customerRequestSchema>;

export function parseCustomerRequest(value: unknown): CustomerRequest {
  return customerRequestSchema.parse(value);
}

export function validateProvisioningDatabaseTarget(env: NodeJS.ProcessEnv = process.env) {
  if (!(["development", "test"] as string[]).includes(env.WEFT_PROVISION_TARGET ?? "")) {
    throw new Error("Set WEFT_PROVISION_TARGET=development or test.");
  }
  const databaseUrl = env.DATABASE_MIGRATION_URL;
  if (!databaseUrl) throw new Error("DATABASE_MIGRATION_URL is required.");
  let database: URL;
  try { database = new URL(databaseUrl); } catch { throw new Error("DATABASE_MIGRATION_URL must be a valid PostgreSQL URL."); }
  if (!["postgres:", "postgresql:"].includes(database.protocol) || database.pathname.slice(1) !== "weft_console_test" ||
    !database.hostname.endsWith(".neon.tech") || database.searchParams.get("sslmode") === "disable") {
    throw new Error("Provisioning is restricted to TLS Neon weft_console_test.");
  }
  return { databaseUrl };
}

export function validateProvisioningEnvironment(env: NodeJS.ProcessEnv & { instanceId?: string } = process.env) {
  const { databaseUrl } = validateProvisioningDatabaseTarget(env);
  if (!env.CLERK_SECRET_KEY?.trim()) throw new Error("CLERK_SECRET_KEY is required.");
  if (!env.WEFT_CLERK_INSTANCE_ID?.trim()) throw new Error("WEFT_CLERK_INSTANCE_ID is required.");
  if (!env.WEFT_PROVISION_OPERATOR?.trim()) throw new Error("WEFT_PROVISION_OPERATOR is required.");
  const appOrigin = env.WEFT_APP_ORIGIN;
  let appUrl: URL;
  try { appUrl = new URL(appOrigin ?? ""); } catch { throw new Error("WEFT_APP_ORIGIN must be a canonical application origin."); }
  const local = ["localhost", "127.0.0.1", "::1"].includes(appUrl.hostname);
  if ((!local && appUrl.protocol !== "https:") || (local && !["http:", "https:"].includes(appUrl.protocol)) ||
    appUrl.username || appUrl.password || appUrl.search || appUrl.hash || !["", "/"].includes(appUrl.pathname) ||
    appUrl.origin !== (appOrigin ?? "").replace(/\/$/, "")) {
    throw new Error("WEFT_APP_ORIGIN must be a canonical same-origin application URL.");
  }
  const expectedInstanceId = env.WEFT_CLERK_INSTANCE_ID;
  if (env.instanceId !== undefined && env.instanceId !== expectedInstanceId) throw new Error("Requested Clerk instance does not match WEFT_CLERK_INSTANCE_ID.");
  return { databaseUrl, instanceId: expectedInstanceId, appOrigin: appUrl.origin, operator: env.WEFT_PROVISION_OPERATOR };
}
