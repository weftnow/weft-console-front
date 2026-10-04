import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as identity from "./schema/identity";
import * as eventTables from "./schema/events";
import * as invitationTables from "./schema/organization-invitations";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for database access");
  const url = new URL(connectionString);
  if (!(["postgres:", "postgresql:"].includes(url.protocol))) throw new Error("DATABASE_URL must be PostgreSQL");
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (!isLocal && url.searchParams.get("sslmode") === "disable") throw new Error("DATABASE_URL must use TLS for remote PostgreSQL");
  // pg's connection-string parser can replace the explicit SSL object when
  // sslmode is present. Keep the driver option authoritative.
  url.searchParams.delete("sslmode");
  const pool = new Pool({
    connectionString: url.toString(), max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000,
    ssl: isLocal ? false : { rejectUnauthorized: true },
  });
  return drizzle({ client: pool, schema: { ...identity, ...eventTables, ...invitationTables } });
}

export function getDatabase() {
  database ??= createDatabase();
  return database;
}

export async function closeDatabase() {
  const current = database;
  database = undefined;
  if (current) await current.$client.end();
}
