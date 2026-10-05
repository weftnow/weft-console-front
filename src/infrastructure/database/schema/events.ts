import { sql } from "drizzle-orm";
import {
  check, customType, date, foreignKey, index, integer, pgEnum, pgTable,
  primaryKey, text, time, timestamp, unique, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { organizationMemberships, organizations, users } from "./identity.ts";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
export const guestType = pgEnum("event_guest_type", ["Attendee", "VIP", "Sponsor"]);
export const guestSource = pgEnum("event_guest_source", ["csv", "manual"]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(), description: text("description").notNull(),
  city: text("city").notNull(), venue: text("venue"),
  expectedAttendees: integer("expected_attendees"),
  categories: text("categories").array().default(sql`ARRAY[]::text[]`).notNull(),
  expectedAudience: text("expected_audience").array().default(sql`ARRAY[]::text[]`).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  startTime: time("start_time"), endTime: time("end_time"),
  timezone: text("timezone").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("events_id_organization_unique").on(table.id, table.organizationId),
  index("events_organization_start_id_idx").on(table.organizationId, table.startsAt, table.id),
  index("events_creator_idx").on(table.creatorId),
  check("events_name_valid", sql`length(btrim(${table.name})) between 1 and 160`),
  check("events_description_valid", sql`length(btrim(${table.description})) between 1 and 500`),
  check("events_venue_valid", sql`${table.venue} is null or length(${table.venue}) <= 200`),
  check("events_estimate_valid", sql`${table.expectedAttendees} is null or ${table.expectedAttendees} between 0 and 1000000`),
  check("events_date_order", sql`${table.endDate} >= ${table.startDate} and ${table.endsAt} > ${table.startsAt}`),
  check("events_city_allowed", sql`${table.city} in ('Las Vegas, USA','Singapore','Davos, Switzerland','Aspen, USA','Monaco')`),
  check("events_categories_allowed", sql`cardinality(${table.categories}) > 0 and ${table.categories} <@ ARRAY['Sports','Luxury','Investing','Startups','Technology','Entertainment','Web3','Real Estate','Fashion','Media']::text[]`),
  check("events_audience_allowed", sql`${table.expectedAudience} <@ ARRAY['Founders','Investors','Family Offices','Executives','Brands','Sponsors','Creators','Media','Athletes','Government','Service Providers']::text[]`),
]);

export const eventAttendeeImports = pgTable("event_attendee_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  importedBy: uuid("imported_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  fileName: text("file_name").notNull(),
  contentHash: text("content_hash"),
  fingerprintVersion: integer("fingerprint_version").default(1).notNull(),
  importedCount: integer("imported_count").notNull(),
  storedCount: integer("stored_count").notNull(),
  duplicateCount: integer("duplicate_count").default(0).notNull(),
  blankCount: integer("blank_count").default(0).notNull(),
  vipCount: integer("vip_count").notNull(),
  sponsorCount: integer("sponsor_count").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("event_attendee_imports_id_event_unique").on(table.id, table.eventId),
  uniqueIndex("event_attendee_imports_fingerprint_unique").on(table.eventId, table.fingerprintVersion, table.contentHash).where(sql`${table.contentHash} is not null`),
  index("event_attendee_imports_history_idx").on(table.eventId, table.importedAt, table.id),
  check("event_import_file_valid", sql`length(btrim(${table.fileName})) between 1 and 255 and ${table.fileName} !~ '[\\\\/[:cntrl:]]'`),
  check("event_import_fingerprint_valid", sql`${table.fingerprintVersion} = 1 and (${table.contentHash} is null or ${table.contentHash} ~ '^[0-9a-f]{64}$')`),
  check("event_import_counts_valid", sql`${table.importedCount} between 0 and 2000 and ${table.storedCount} between 0 and 2000 and ${table.duplicateCount} >= 0 and ${table.blankCount} >= 0 and ${table.importedCount} = ${table.storedCount} + ${table.duplicateCount} and ${table.vipCount} >= 0 and ${table.sponsorCount} >= 0 and ${table.vipCount} + ${table.sponsorCount} <= ${table.storedCount}`),
]);

export const eventGuests = pgTable("event_guests", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  firstName: text("first_name").notNull(), lastName: text("last_name").notNull(),
  email: text("email").notNull(), normalizedEmail: text("normalized_email"),
  phone: text("phone").notNull(), company: text("company").notNull(),
  jobPosition: text("job_position").notNull(), profileType: text("profile_type").notNull(),
  linkedin: text("linkedin").notNull(),
  guestType: guestType("guest_type").notNull(), source: guestSource("source").notNull(),
  importId: uuid("import_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("event_guests_event_position_idx").on(table.eventId, table.position),
  unique("event_guests_event_position_unique").on(table.eventId, table.position),
  uniqueIndex("event_guests_event_email_unique").on(table.eventId, table.normalizedEmail).where(sql`${table.normalizedEmail} is not null`),
  foreignKey({ columns: [table.importId, table.eventId], foreignColumns: [eventAttendeeImports.id, eventAttendeeImports.eventId], name: "event_guests_import_event_fk" }).onDelete("no action"),
  check("event_guests_position_valid", sql`${table.position} >= 0`),
  check("event_guests_name_valid", sql`length(${table.firstName}) <= 100 and length(${table.lastName}) <= 100 and length(btrim(${table.firstName} || ${table.lastName})) > 0`),
  check("event_guests_contact_valid", sql`length(${table.email}) <= 254 and length(${table.phone}) <= 40 and length(${table.company}) <= 200 and length(${table.jobPosition}) <= 200 and length(${table.profileType}) <= 100 and length(${table.linkedin}) <= 500`),
  check("event_guests_source_import_valid", sql`(${table.source} = 'csv' and ${table.importId} is not null) or (${table.source} = 'manual' and ${table.importId} is null)`),
  check("event_guests_email_normalized_valid", sql`${table.normalizedEmail} is not distinct from nullif(lower(btrim(${table.email})), '')`),
]);

export const eventStaff = pgTable("event_staff", {
  eventId: uuid("event_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  membershipId: uuid("membership_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.eventId, table.membershipId] }),
  foreignKey({ columns: [table.eventId, table.organizationId], foreignColumns: [events.id, events.organizationId], name: "event_staff_event_org_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.membershipId, table.organizationId], foreignColumns: [organizationMemberships.id, organizationMemberships.organizationId], name: "event_staff_membership_org_fk" }).onDelete("restrict"),
  index("event_staff_membership_idx").on(table.membershipId),
]);

export const eventCovers = pgTable("event_covers", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  bytes: bytea("bytes").notNull(),
  mimeType: text("mime_type").notNull().default("image/webp"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("event_covers_size_valid", sql`octet_length(${table.bytes}) between 1 and 262144`),
  check("event_covers_mime_valid", sql`${table.mimeType} = 'image/webp'`),
]);
