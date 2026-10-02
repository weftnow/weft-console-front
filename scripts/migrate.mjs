import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_MIGRATION_URL || !["development", "test"].includes(process.env.WEFT_MIGRATION_TARGET)) {
  console.error("Set DATABASE_MIGRATION_URL and WEFT_MIGRATION_TARGET=development|test explicitly.");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_MIGRATION_URL);
if (!["postgres:", "postgresql:"].includes(url.protocol) || (!["localhost", "127.0.0.1", "::1"].includes(url.hostname) && url.searchParams.get("sslmode") === "disable")) {
  console.error("Migration URL must be PostgreSQL with TLS for remote hosts.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
