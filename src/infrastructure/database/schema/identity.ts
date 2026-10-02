import { sql } from "drizzle-orm";
import { boolean, check, index, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", ["owner", "organizer", "staff", "sponsor"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("users_display_name_valid", sql`length(btrim(${table.displayName})) between 1 and 160`)]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("organizations_name_valid", sql`length(btrim(${table.name})) between 1 and 200`)]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  role: membershipRole("role").notNull(),
  active: boolean("active").default(true).notNull(),
}, (table) => [
  unique("memberships_organization_user_unique").on(table.organizationId, table.userId),
  unique("memberships_id_organization_unique").on(table.id, table.organizationId),
  index("memberships_user_active_idx").on(table.userId, table.active),
]);
