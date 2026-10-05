import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations, users } from "./identity.ts";

export const organizationAuthIdentities = pgTable("organization_auth_identities", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("clerk"),
  instanceId: text("instance_id").notNull(),
  subject: text("subject").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("organization_auth_identities_provider_check", sql`${table.provider} = 'clerk'`),
  check("organization_auth_identities_instance_nonempty", sql`length(btrim(${table.instanceId})) > 0`),
  check("organization_auth_identities_subject_nonempty", sql`length(btrim(${table.subject})) > 0`),
  unique("organization_auth_identity_provider_instance_subject_unique").on(table.provider, table.instanceId, table.subject),
  unique("organization_auth_identity_organization_instance_unique").on(table.organizationId, table.provider, table.instanceId),
]);

export const organizationInvitations = pgTable("organization_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  instanceId: text("instance_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  inviterUserId: uuid("inviter_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  providerInvitationId: text("provider_invitation_id"),
  status: text("status").notNull().default("pending"),
  deliveryState: text("delivery_state").notNull().default("queued"),
  deliveryLeaseUntil: timestamp("delivery_lease_until", { withTimezone: true }),
  deliveryErrorCode: text("delivery_error_code"),
  providerCleanupPending: boolean("provider_cleanup_pending").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedSubject: text("accepted_subject"),
  acceptedUserId: uuid("accepted_user_id").references(() => users.id, { onDelete: "restrict" }),
}, (table) => [
  check("organization_invitations_instance_nonempty", sql`length(btrim(${table.instanceId})) > 0`),
  check("organization_invitations_email_normalized", sql`${table.email} = lower(btrim(${table.email})) and length(${table.email}) between 1 and 254`),
  check("organization_invitations_role_check", sql`${table.role} in ('owner', 'organizer')`),
  check("organization_invitations_status_check", sql`${table.status} in ('pending', 'accepted', 'revoked', 'expired')`),
  check("organization_invitations_delivery_state_check", sql`${table.deliveryState} in ('queued', 'sending', 'sent', 'unknown', 'failed')`),
  check("organization_invitations_accepted_fields_coherent", sql`(${table.status} = 'accepted' and ${table.acceptedAt} is not null and ${table.acceptedSubject} is not null and ${table.acceptedUserId} is not null) or (${table.status} <> 'accepted' and ${table.acceptedAt} is null and ${table.acceptedSubject} is null and ${table.acceptedUserId} is null)`),
  uniqueIndex("organization_invitations_instance_provider_id_unique").on(table.instanceId, table.providerInvitationId).where(sql`${table.providerInvitationId} is not null`),
  uniqueIndex("organization_invitations_pending_email_unique").on(table.organizationId, table.instanceId, table.email).where(sql`${table.status} = 'pending'`),
  index("organization_invitations_organization_created_idx").on(table.organizationId, table.instanceId, table.createdAt),
]);
