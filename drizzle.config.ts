import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/infrastructure/database/schema/identity.ts", "./src/infrastructure/database/schema/events.ts", "./src/infrastructure/database/schema/organization-invitations.ts"],
  out: "./drizzle",
  ...(process.env.DATABASE_MIGRATION_URL ? { dbCredentials: { url: process.env.DATABASE_MIGRATION_URL } } : {}),
});
