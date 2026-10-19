import { sql } from "drizzle-orm";
import {
  check, customType, date, foreignKey, index, integer, jsonb, pgEnum, pgTable,
  primaryKey, text, time, timestamp, unique, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { organizationMemberships, organizations, users } from "./identity.ts";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
export const guestType = pgEnum("event_guest_type", ["Attendee", "VIP", "Sponsor"]);
export const guestSource = pgEnum("event_guest_source", ["csv", "manual"]);
export const eventConsoleAccess = pgEnum("event_console_access", ["operator", "wefter"]);
export const guestNetworkingStatus = pgEnum("event_guest_networking_status", ["included", "excluded"]);
export const guestExclusionReason = pgEnum("event_guest_exclusion_reason", ["guest_request", "organizer_decision", "not_attending", "other"]);
export const matchIntroductionPath = pgEnum("event_match_introduction_path", ["sms_coordination", "wefter"]);
export const matchStatus = pgEnum("event_match_status", ["active", "revoked"]);
export const matchRevocationReason = pgEnum("event_match_revocation_reason", ["guest_excluded", "pair_blocked", "identity_resolution_required", "guest_missing"]);
export const matchingChangeKind = pgEnum("event_matching_change_kind", ["guest_excluded", "guest_restored", "match_block_added", "match_block_removed", "profile_updated", "attendees_imported", "attendee_corrected", "identity_linked"]);

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

/** Event-local identity. Guest rows remain the durable participation/source records. */
export const eventPeople = pgTable("event_people", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("event_people_id_event_unique").on(table.id, table.eventId),
  foreignKey({ columns: [table.eventId], foreignColumns: [events.id], name: "event_people_event_fk" }).onDelete("cascade"),
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
  personId: uuid("person_id").notNull(),
  revision: integer("revision").default(1).notNull(),
  normalizedPhone: text("normalized_phone"),
  networkingStatus: guestNetworkingStatus("networking_status").default("included").notNull(),
  networkingExcludedAt: timestamp("networking_excluded_at", { withTimezone: true }),
  networkingExcludedBy: uuid("networking_excluded_by").references(() => users.id, { onDelete: "restrict" }),
  networkingExclusionReason: guestExclusionReason("networking_exclusion_reason"),
  networkingVersion: integer("networking_version").default(1).notNull(),
  /** Number of the current row in event_guest_profile_versions; 0 means no profile has been saved yet. */
  profileVersion: integer("profile_version").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("event_guests_id_event_unique").on(table.id, table.eventId),
  index("event_guests_event_position_idx").on(table.eventId, table.position),
  unique("event_guests_event_position_unique").on(table.eventId, table.position),
  index("event_guests_event_email_idx").on(table.eventId, table.normalizedEmail),
  index("event_guests_event_phone_idx").on(table.eventId, table.normalizedPhone),
  foreignKey({ columns: [table.importId, table.eventId], foreignColumns: [eventAttendeeImports.id, eventAttendeeImports.eventId], name: "event_guests_import_event_fk" }).onDelete("no action"),
  foreignKey({ columns: [table.personId, table.eventId], foreignColumns: [eventPeople.id, eventPeople.eventId], name: "event_guests_person_event_fk" }).onDelete("restrict"),
  check("event_guests_position_valid", sql`${table.position} >= 0`),
  check("event_guests_name_valid", sql`length(${table.firstName}) <= 100 and length(${table.lastName}) <= 100 and length(btrim(${table.firstName} || ${table.lastName})) > 0`),
  check("event_guests_contact_valid", sql`length(${table.email}) <= 254 and length(${table.phone}) <= 40 and length(${table.company}) <= 200 and length(${table.jobPosition}) <= 200 and length(${table.profileType}) <= 100 and length(${table.linkedin}) <= 500`),
  check("event_guests_source_import_valid", sql`(${table.source} = 'csv' and ${table.importId} is not null) or (${table.source} = 'manual' and ${table.importId} is null)`),
  check("event_guests_email_normalized_valid", sql`${table.normalizedEmail} is not distinct from nullif(lower(btrim(${table.email})), '')`),
  check("event_guests_phone_normalized_valid", sql`${table.normalizedPhone} is not distinct from case when ${table.phone} ~ '^\\+?[0-9]([0-9 ()().-]*[0-9])?$' and length(regexp_replace(${table.phone}, '[^0-9]', '', 'g')) between 7 and 15 then nullif(regexp_replace(${table.phone}, '[^+0-9]', '', 'g'), '') else null end`),
  check("event_guests_revision_positive", sql`${table.revision} >= 1`),
  check("event_guests_networking_valid", sql`(${table.networkingStatus} = 'excluded' and ${table.networkingExcludedAt} is not null and ${table.networkingExcludedBy} is not null and ${table.networkingExclusionReason} is not null) or (${table.networkingStatus} = 'included' and ${table.networkingExcludedAt} is null and ${table.networkingExcludedBy} is null and ${table.networkingExclusionReason} is null)`),
  check("event_guests_networking_version_valid", sql`${table.networkingVersion} >= 1`),
  check("event_guests_profile_version_valid", sql`${table.profileVersion} >= 0`),
]);

const PROFILE_MATCHING_KEYS = "ARRAY['goals','offers','desiredConnections','avoid','background','linkedinDetails','missingDetails']::text[]";

/** Append-only profile history. Rows are never updated or deleted, so (guest_id, version) can be pinned by matching and introductions. */
export const eventGuestProfileVersions = pgTable("event_guest_profile_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull(),
  guestId: uuid("guest_id").notNull(),
  version: integer("version").notNull(),
  summary: text("summary"),
  goals: text("goals"), offers: text("offers"), desiredConnections: text("desired_connections"),
  avoid: text("avoid"), background: text("background"),
  linkedinDetails: text("linkedin_details"), missingDetails: text("missing_details"),
  /** Matching fields hidden from the shareable summary. They still feed matching. */
  organizerOnlyFields: text("organizer_only_fields").array().default(sql`ARRAY[]::text[]`).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ columns: [table.guestId, table.eventId], foreignColumns: [eventGuests.id, eventGuests.eventId], name: "event_guest_profile_versions_guest_fk" }).onDelete("cascade"),
  unique("event_guest_profile_versions_guest_version_unique").on(table.guestId, table.version),
  index("event_guest_profile_versions_current_idx").on(table.eventId, table.guestId, table.version.desc()),
  check("event_guest_profile_versions_version_valid", sql`${table.version} >= 1`),
  check("event_guest_profile_versions_summary_valid", sql`${table.summary} is null or (length(${table.summary}) between 1 and 500 and ${table.summary} = btrim(${table.summary}))`),
  check("event_guest_profile_versions_fields_valid", sql`(${table.goals} is null or (length(${table.goals}) between 1 and 2000 and ${table.goals} = btrim(${table.goals}))) and (${table.offers} is null or (length(${table.offers}) between 1 and 2000 and ${table.offers} = btrim(${table.offers}))) and (${table.desiredConnections} is null or (length(${table.desiredConnections}) between 1 and 2000 and ${table.desiredConnections} = btrim(${table.desiredConnections}))) and (${table.avoid} is null or (length(${table.avoid}) between 1 and 2000 and ${table.avoid} = btrim(${table.avoid}))) and (${table.background} is null or (length(${table.background}) between 1 and 2000 and ${table.background} = btrim(${table.background}))) and (${table.linkedinDetails} is null or (length(${table.linkedinDetails}) between 1 and 2000 and ${table.linkedinDetails} = btrim(${table.linkedinDetails}))) and (${table.missingDetails} is null or (length(${table.missingDetails}) between 1 and 2000 and ${table.missingDetails} = btrim(${table.missingDetails})))`),
  check("event_guest_profile_versions_organizer_only_valid", sql`${table.organizerOnlyFields} <@ ${sql.raw(PROFILE_MATCHING_KEYS)}`),
]);

/** Do-not-match pairs. The pair is stored in canonical order, so A+B and B+A are one row and a guest cannot block themself. */
export const eventMatchBlocks = pgTable("event_guest_match_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestLowId: uuid("guest_low_id").notNull(),
  guestHighId: uuid("guest_high_id").notNull(),
  reason: text("reason"),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ columns: [table.guestLowId, table.eventId], foreignColumns: [eventGuests.id, eventGuests.eventId], name: "event_guest_match_blocks_low_guest_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.guestHighId, table.eventId], foreignColumns: [eventGuests.id, eventGuests.eventId], name: "event_guest_match_blocks_high_guest_fk" }).onDelete("cascade"),
  unique("event_guest_match_blocks_pair_unique").on(table.eventId, table.guestLowId, table.guestHighId),
  index("event_guest_match_blocks_high_idx").on(table.eventId, table.guestHighId),
  check("event_guest_match_blocks_order_valid", sql`${table.guestLowId} < ${table.guestHighId}`),
  check("event_guest_match_blocks_reason_valid", sql`${table.reason} is null or length(${table.reason}) <= 500`),
]);

type PerGuest<T> = Record<string, T>;

/**
 * One automatically selected pair per event, stored in canonical order. A match is a selection only: it records no guest
 * acceptance, meeting or Wefter assignment (F10-F13). JSON columns are keyed by guest id, as in the engine feed.
 */
export const eventMatches = pgTable("event_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestLowId: uuid("guest_low_id").notNull(),
  guestHighId: uuid("guest_high_id").notNull(),
  engineRecommendationId: uuid("engine_recommendation_id").notNull(),
  sourceRunId: uuid("source_run_id"),
  profileVersionLow: integer("profile_version_low").notNull(),
  profileVersionHigh: integer("profile_version_high").notNull(),
  scoreLow: integer("score_low").notNull(),
  scoreHigh: integer("score_high").notNull(),
  pairScore: integer("pair_score").notNull(),
  benefits: jsonb("benefits").$type<PerGuest<string | null>>().notNull(),
  shareableReasons: jsonb("shareable_reasons").$type<PerGuest<string | null>>().notNull(),
  missingInformation: jsonb("missing_information").$type<PerGuest<string[]>>().notNull(),
  evidence: jsonb("evidence").$type<Array<Record<string, string>>>().notNull(),
  uncertainty: text("uncertainty").notNull(),
  /** Fixed when the match is created so a later guest-type correction does not silently change who coordinates it. */
  introductionPath: matchIntroductionPath("introduction_path").notNull(),
  status: matchStatus("status").default("active").notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revocationReason: matchRevocationReason("revocation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ columns: [table.guestLowId, table.eventId], foreignColumns: [eventGuests.id, eventGuests.eventId], name: "event_matches_low_guest_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.guestHighId, table.eventId], foreignColumns: [eventGuests.id, eventGuests.eventId], name: "event_matches_high_guest_fk" }).onDelete("cascade"),
  unique("event_matches_pair_unique").on(table.eventId, table.guestLowId, table.guestHighId),
  unique("event_matches_recommendation_unique").on(table.eventId, table.engineRecommendationId),
  unique("event_matches_id_event_unique").on(table.id, table.eventId),
  index("event_matches_event_status_idx").on(table.eventId, table.status, table.createdAt.desc()),
  index("event_matches_high_idx").on(table.eventId, table.guestHighId),
  check("event_matches_order_valid", sql`${table.guestLowId} < ${table.guestHighId}`),
  check("event_matches_scores_valid", sql`${table.scoreLow} between 0 and 100 and ${table.scoreHigh} between 0 and 100 and ${table.pairScore} between 0 and 100`),
  check("event_matches_profile_versions_valid", sql`${table.profileVersionLow} >= 0 and ${table.profileVersionHigh} >= 0`),
  check("event_matches_revocation_valid", sql`(${table.status} = 'active' and ${table.revokedAt} is null and ${table.revocationReason} is null) or (${table.status} = 'revoked' and ${table.revokedAt} is not null and ${table.revocationReason} is not null)`),
]);

/** Per-event position in the engine feed. Only advanced in the transaction that applies the page. */
export const eventMatchFeedCursors = pgTable("event_match_feed_cursors", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  lastSeq: integer("last_seq").default(0).notNull(),
  /** Last finished engine run the Console has fully synced, so the status poll syncs once per run. */
  checkedThroughRunId: uuid("checked_through_run_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("event_match_feed_cursors_seq_valid", sql`${table.lastSeq} >= 0`),
]);

/** Append-only log of networking changes, written in the same transaction as each change. Automatic matching only sets processed_at. */
export const eventMatchingChanges = pgTable("event_matching_changes", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  kind: matchingChangeKind("kind").notNull(),
  guestIds: uuid("guest_ids").array().notNull(),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => [
  index("event_matching_changes_pending_idx").on(table.eventId, table.processedAt, table.createdAt),
  // Event-level kinds carry no guests; compare as text so the check does not use a just-added enum value in its own transaction.
  check("event_matching_changes_guests_valid", sql`(${table.kind}::text in ('attendees_imported', 'identity_linked') and cardinality(${table.guestIds}) = 0) or (${table.kind}::text not in ('attendees_imported', 'identity_linked') and cardinality(${table.guestIds}) between 1 and 2)`),
  check("event_matching_changes_reason_valid", sql`${table.reason} is null or length(${table.reason}) <= 500`),
]);

export const eventStaff = pgTable("event_staff", {
  eventId: uuid("event_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  membershipId: uuid("membership_id").notNull(),
  consoleAccess: eventConsoleAccess("console_access"),
  revision: integer("revision").default(1).notNull(),
  availabilityWindows: jsonb("availability_windows").$type<Array<{ startsAt: string; endsAt: string }>>().default(sql`'[]'::jsonb`).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.eventId, table.membershipId] }),
  foreignKey({ columns: [table.eventId, table.organizationId], foreignColumns: [events.id, events.organizationId], name: "event_staff_event_org_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.membershipId, table.organizationId], foreignColumns: [organizationMemberships.id, organizationMemberships.organizationId], name: "event_staff_membership_org_fk" }).onDelete("restrict"),
  index("event_staff_membership_idx").on(table.membershipId),
  check("event_staff_revision_positive", sql`${table.revision} >= 1`),
]);

export const eventNetworkingSettings = pgTable("event_networking_settings", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  revision: integer("revision").default(1).notNull(),
  settings: jsonb("settings").$type<{
    networkingWindows: Array<{ startsAt: string; endsAt: string }>;
    stopNewIntroductionsAt: string | null;
    landmarks: Array<{ id: string; name: string; directions: string | null }>;
    softMaxIntroductionsPerGuest: number | null;
    locationFreshnessMinutes: number | null;
    dispatchAcknowledgmentMinutes: number | null;
    missedMeetingMinutes: number | null;
  }>().notNull(),
  updatedBy: uuid("updated_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check("event_networking_settings_revision_positive", sql`${table.revision} >= 1`)]);

export const eventCovers = pgTable("event_covers", {
  eventId: uuid("event_id").primaryKey().references(() => events.id, { onDelete: "cascade" }),
  bytes: bytea("bytes").notNull(),
  mimeType: text("mime_type").notNull().default("image/webp"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("event_covers_size_valid", sql`octet_length(${table.bytes}) between 1 and 262144`),
  check("event_covers_mime_valid", sql`${table.mimeType} = 'image/webp'`),
]);
