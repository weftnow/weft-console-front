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
  const target = env.WEFT_PROVISION_TARGET;
  const supportedTargets = new Set(["development", "test", "production"]);
  if (!target || !supportedTargets.has(target)) {
    throw new Error("Set WEFT_PROVISION_TARGET to development, test, or production.");
  }
  const databaseUrl = env.DATABASE_MIGRATION_URL;
  if (!databaseUrl) throw new Error("DATABASE_MIGRATION_URL is required.");
  let database: URL;
  try { database = new URL(databaseUrl); } catch { throw new Error("DATABASE_MIGRATION_URL must be a valid PostgreSQL URL."); }

  const expectedDatabase = target === "production" ? "weft_console" : "weft_console_test";
  let databaseName: string;
  try { databaseName = decodeURIComponent(database.pathname.slice(1)); } catch { throw new Error("DATABASE_MIGRATION_URL must contain a valid database path."); }
  const allowedQueryParameters = new Set(["sslmode", "channel_binding", "application_name"]);
  const queryParameters = [...database.searchParams.keys()];
  const repeatedQueryParameter = queryParameters.some((key) => database.searchParams.getAll(key).length !== 1);
  const hasUnsupportedQueryParameter = queryParameters.some((key) => !allowedQueryParameters.has(key));
  const sslModes = new Set(["require", "verify-ca", "verify-full"]);
  const sslMode = database.searchParams.get("sslmode");
  if (!["postgres:", "postgresql:"].includes(database.protocol) || databaseName !== expectedDatabase ||
    !database.hostname.endsWith(".neon.tech") || (target === "production" && database.hostname.includes("-pooler.")) ||
    repeatedQueryParameter || hasUnsupportedQueryParameter || !sslMode || !sslModes.has(sslMode)) {
    throw new Error(`DATABASE_MIGRATION_URL must target TLS Neon ${expectedDatabase} with supported connection options.`);
  }
  return { databaseUrl };
}

export function validateProvisioningEnvironment(env: NodeJS.ProcessEnv & { instanceId?: string } = process.env) {
  const { databaseUrl } = validateProvisioningDatabaseTarget(env);
  const target = env.WEFT_PROVISION_TARGET;
  const clerkSecretKey = env.CLERK_SECRET_KEY?.trim();
  if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY is required.");
  if ((target === "production" && (!clerkSecretKey.startsWith("sk_live_") || clerkSecretKey.length === "sk_live_".length)) ||
    (target !== "production" && clerkSecretKey.startsWith("sk_live_"))) {
    throw new Error("CLERK_SECRET_KEY prefix must match WEFT_PROVISION_TARGET.");
  }
  if (!env.WEFT_CLERK_INSTANCE_ID?.trim()) throw new Error("WEFT_CLERK_INSTANCE_ID is required.");
  if (!env.WEFT_PROVISION_OPERATOR?.trim()) throw new Error("WEFT_PROVISION_OPERATOR is required.");
  const appOrigin = env.WEFT_APP_ORIGIN;
  let appUrl: URL;
  try { appUrl = new URL(appOrigin ?? ""); } catch { throw new Error("WEFT_APP_ORIGIN must be a canonical application origin."); }
  const hostname = appUrl.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  const local = hostname === "localhost" || hostname.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "::1";
  if ((target === "production" && local) || (!local && appUrl.protocol !== "https:") || (local && !["http:", "https:"].includes(appUrl.protocol)) ||
    appUrl.username || appUrl.password || appUrl.search || appUrl.hash || !["", "/"].includes(appUrl.pathname) ||
    appUrl.origin !== (appOrigin ?? "").replace(/\/$/, "")) {
    throw new Error("WEFT_APP_ORIGIN must be a canonical same-origin application URL.");
  }
  const expectedInstanceId = env.WEFT_CLERK_INSTANCE_ID;
  if (env.instanceId !== undefined && env.instanceId !== expectedInstanceId) throw new Error("Requested Clerk instance does not match WEFT_CLERK_INSTANCE_ID.");
  return { databaseUrl, instanceId: expectedInstanceId, appOrigin: appUrl.origin, operator: env.WEFT_PROVISION_OPERATOR };
}
