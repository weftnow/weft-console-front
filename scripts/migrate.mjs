import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

function parseDatabaseUrl(value, name) {
  let url;
  try { url = new URL(value ?? ""); } catch { throw new Error(`${name} must be a valid PostgreSQL URL.`); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error(`${name} must be PostgreSQL.`);
  // pg treats query parameters as connection options, which can override the
  // validated URL host/database and explicit SSL object. Accept only safe keys.
  for (const key of url.searchParams.keys()) {
    if (!["sslmode", "channel_binding", "application_name"].includes(key)) {
      throw new Error(`${name} contains unsupported connection parameters.`);
    }
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!local && !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode"))) {
    throw new Error(`${name} must explicitly require TLS for remote hosts.`);
  }
  return url;
}

export function validateMigrationEnvironment(env = process.env) {
  const target = env.WEFT_MIGRATION_TARGET;
  if (!["development", "test", "production"].includes(target)) {
    throw new Error("Set WEFT_MIGRATION_TARGET=development|test|production explicitly.");
  }
  const url = parseDatabaseUrl(env.DATABASE_MIGRATION_URL, "DATABASE_MIGRATION_URL");
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error("DATABASE_MIGRATION_URL must name a database.");
  if (target === "production" || env.VERCEL === "1") {
    const expectedDatabase = target === "production" ? "weft_console" : "weft_console_test";
    if (database !== expectedDatabase || !url.hostname.endsWith(".neon.tech") || url.hostname.includes("-pooler.")) {
      throw new Error(`Migration target requires a direct TLS Neon connection to ${expectedDatabase}.`);
    }
  } else if (database === "weft_console") {
    throw new Error("weft_console requires WEFT_MIGRATION_TARGET=production.");
  }
  if (env.VERCEL === "1") {
    if (!["production", "preview"].includes(env.VERCEL_ENV) ||
      (env.VERCEL_ENV === "production") !== (target === "production")) {
      throw new Error("VERCEL_ENV and WEFT_MIGRATION_TARGET must match production or preview.");
    }
    const runtime = parseDatabaseUrl(env.DATABASE_URL, "DATABASE_URL");
    if (runtime.hostname.replace(/-pooler(?=\.)/, "") !== url.hostname ||
      decodeURIComponent(runtime.pathname.slice(1)) !== database || runtime.port !== url.port) {
      throw new Error("Runtime and migration URLs must point to the same Neon endpoint and database.");
    }
  }
  return { url, database };
}

export async function runMigrations(env = process.env, {
  createClient = (options) => new Client(options),
  applyMigrations = (client) => migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL("../drizzle/", import.meta.url)),
  }),
} = {}) {
  const { url } = validateMigrationEnvironment(env);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  // Keep pg's explicit certificate verification authoritative.
  url.searchParams.delete("sslmode");
  const client = createClient({
    connectionString: url.toString(),
    ssl: local ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    await client.query("SET lock_timeout = '60s'");
    // Same session owns the lock and runs Drizzle's journal check/transaction.
    // Closing the connection releases the lock, including on migration failure.
    await client.query("SELECT pg_advisory_lock(hashtext('weft-console-migrations'))");
    await applyMigrations(client);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations().then(() => {
    console.log("Database migrations completed; pending migrations applied.");
  }).catch(() => {
    // Driver errors can contain connection details or SQL/data; keep build logs safe.
    console.error("Database migration failed. Check the target configuration, migration history, and database connectivity before retrying.");
    process.exitCode = 1;
  });
}
