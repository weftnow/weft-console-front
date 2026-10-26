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

export const userAuthIdentities = pgTable("user_auth_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("clerk"),
  instanceId: text("instance_id").notNull(),
  subject: text("subject").notNull(),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("user_auth_identities_provider_check", sql`${table.provider} = 'clerk'`),
  check("user_auth_identities_instance_nonempty", sql`length(btrim(${table.instanceId})) > 0`),
  check("user_auth_identities_subject_nonempty", sql`length(btrim(${table.subject})) > 0`),
  unique("identity_provider_instance_subject_unique").on(table.provider, table.instanceId, table.subject),
  unique("identity_user_provider_instance_unique").on(table.userId, table.provider, table.instanceId),
]);

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
