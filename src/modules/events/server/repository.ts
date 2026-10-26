import "server-only";
import { and, count, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationMemberships, users } from "@/infrastructure/database/schema/identity";
import { eventAttendeeImports, eventCovers, eventGuestProfileVersions, eventGuests, eventMatchBlocks, eventPeople, events, eventStaff } from "@/infrastructure/database/schema/events";
import { EMPTY_PRESENCE, profileCompleteness } from "@/modules/attendees/profile-completeness";
import { canAssignStaff, canCreateEvent } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";
import type { EventDetailDto } from "../event-dto";
import type { PreparedEvent } from "./service";
import { normalizeAttendeePhone } from "../attendee-contact";
import { recordChange } from "@/modules/attendees/server/networking-repository";

export async function create(prepared: PreparedEvent): Promise<EventDetailDto> {
  const { data, schedule, guests, imported, cover, userId, organizationId } = prepared;
  const database = getDatabase();
  const eventId = await database.transaction(async (tx) => {
    const selectedIds = [...data.staffMembershipIds].sort();
    const memberships = await tx.select().from(organizationMemberships)
      .where(and(eq(organizationMemberships.organizationId, organizationId), or(
        eq(organizationMemberships.userId, userId),
        selectedIds.length ? inArray(organizationMemberships.id, selectedIds) : eq(organizationMemberships.userId, userId),
      )))
      .orderBy(organizationMemberships.id).for("update");
    const creator = memberships.find((membership) => membership.userId === userId);
    if (!canCreateEvent(creator ?? null)) throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization.");
    for (const membershipId of selectedIds) {
      const member = memberships.find((membership) => membership.id === membershipId);
      if (!canAssignStaff(member ?? null)) throw new ApplicationError("VALIDATION_ERROR", "Check the selected staff.", { staffMembershipIds: "Selected staff must be active members of this organization." });
    }
    const [inserted] = await tx.insert(events).values({
      organizationId, creatorId: userId, name: data.name, description: data.description,
      city: data.city, venue: data.venue, expectedAttendees: data.expectedAttendees,
      categories: data.categories, expectedAudience: data.expectedAudience,
      startDate: data.startDate, endDate: data.endDate, startTime: data.startTime,
      endTime: data.endTime, timezone: schedule.timezone,
      startsAt: new Date(schedule.startsAt), endsAt: new Date(schedule.endsAt),
    }).returning({ id: events.id });
    let importId: string | null = null;
    if (imported) {
      const [batch] = await tx.insert(eventAttendeeImports).values({
        eventId: inserted.id, importedBy: userId, fileName: imported.fileName,
        contentHash: imported.contentHash, fingerprintVersion: 1,
        importedCount: imported.importedCount, storedCount: imported.importedCount,
        duplicateCount: 0, blankCount: imported.blankCount,
        vipCount: imported.vipCount, sponsorCount: imported.sponsorCount,
      }).returning({ id: eventAttendeeImports.id });
      importId = batch.id;
    }
    if (guests.length) {
      const people = guests.map(() => crypto.randomUUID());
      await tx.insert(eventPeople).values(people.map((id) => ({ id, eventId: inserted.id })));
      await tx.insert(eventGuests).values(guests.map((guest, position) => ({
        personId: people[position], revision: 1,
        eventId: inserted.id, position, firstName: guest.firstName, lastName: guest.lastName,
        email: guest.email, normalizedEmail: guest.email || null, phone: guest.phone,
        normalizedPhone: normalizeAttendeePhone(guest.phone),
        company: guest.company, jobPosition: guest.position, profileType: guest.profileType,
        linkedin: guest.linkedin, guestType: guest.guestType, source: guest.source,
        importId: guest.source === "csv" ? importId : null,
      })));
      // Same event-level change a later import records, so the initial roster also starts automatic matching.
      await recordChange(tx, { eventId: inserted.id, actorId: userId, guestIds: [], kind: "attendees_imported", reason: null });
    }
    if (selectedIds.length) await tx.insert(eventStaff).values(selectedIds.map((membershipId) => ({
      eventId: inserted.id, organizationId, membershipId,
    })));
    if (cover) await tx.insert(eventCovers).values({ eventId: inserted.id, bytes: cover.bytes, mimeType: cover.mimeType });
    return inserted.id;
  });
  const event = await findById(eventId, organizationId);
  if (!event) throw new Error("Created event could not be loaded");
  return event;
}

export async function findOrganizationId(eventId: string): Promise<string | null> {
  const [row] = await getDatabase().select({ organizationId: events.organizationId })
    .from(events).where(eq(events.id, eventId)).limit(1);
  return row?.organizationId ?? null;
}

export async function findById(eventId: string, organizationId: string): Promise<EventDetailDto | null> {
  const database = getDatabase();
  const [event] = await database.select().from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId))).limit(1);
  if (!event) return null;
  const [guests, profiles, imports, importTotals, matchBlocks, staff, covers] = await Promise.all([
    database.select().from(eventGuests).where(eq(eventGuests.eventId, eventId)).orderBy(eventGuests.position),
    // Presence flags only: profile text stays out of the roster payload.
    database.select({
      guestId: eventGuestProfileVersions.guestId,
      goals: sql<boolean>`${eventGuestProfileVersions.goals} is not null`,
      offers: sql<boolean>`${eventGuestProfileVersions.offers} is not null`,
      desiredConnections: sql<boolean>`${eventGuestProfileVersions.desiredConnections} is not null`,
      background: sql<boolean>`${eventGuestProfileVersions.background} is not null`,
      linkedinDetails: sql<boolean>`${eventGuestProfileVersions.linkedinDetails} is not null`,
    }).from(eventGuestProfileVersions)
      .innerJoin(eventGuests, and(eq(eventGuestProfileVersions.guestId, eventGuests.id), eq(eventGuestProfileVersions.version, eventGuests.profileVersion)))
      .where(eq(eventGuestProfileVersions.eventId, eventId)),
    database.select().from(eventAttendeeImports).where(eq(eventAttendeeImports.eventId, eventId))
      .orderBy(desc(eventAttendeeImports.importedAt), desc(eventAttendeeImports.id)).limit(20),
    database.select({ total: count() }).from(eventAttendeeImports).where(eq(eventAttendeeImports.eventId, eventId)),
    database.select().from(eventMatchBlocks).where(eq(eventMatchBlocks.eventId, eventId))
      .orderBy(eventMatchBlocks.createdAt, eventMatchBlocks.id),
    database.select({ id: organizationMemberships.id, name: users.displayName, role: organizationMemberships.role, avatar: users.avatarUrl })
      .from(eventStaff)
      .innerJoin(organizationMemberships, eq(eventStaff.membershipId, organizationMemberships.id))
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.organizationId, organizationId), isNotNull(eventStaff.consoleAccess), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff"))),
    database.select({ eventId: eventCovers.eventId }).from(eventCovers).where(eq(eventCovers.eventId, eventId)).limit(1),
  ]);
  const presenceByGuest = new Map(profiles.map((row) => [row.guestId, row]));
  return {
    id: event.id, organizationId: event.organizationId, name: event.name,
    city: event.city as EventDetailDto["city"], venue: event.venue ?? "",
    description: event.description, expectedAttendees: event.expectedAttendees,
    categories: event.categories as EventDetailDto["categories"],
    expectedAudience: event.expectedAudience as EventDetailDto["expectedAudience"],
    startDate: event.startDate, endDate: event.endDate,
    startTime: event.startTime?.slice(0, 5) ?? "", endTime: event.endTime?.slice(0, 5) ?? "",
    timezone: event.timezone, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt.toISOString(),
    createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString(),
    coverImage: covers.length ? `/api/events/${event.id}/cover` : null,
    attendees: {
      canManage: true,
      guests: guests.map((guest) => ({
        id: guest.id, createdAt: guest.createdAt.toISOString(), updatedAt: guest.updatedAt.toISOString(), importId: guest.importId,
        personId: guest.personId, revision: guest.revision,
        company: guest.company, email: guest.email, firstName: guest.firstName,
        guestType: guest.guestType, lastName: guest.lastName, linkedin: guest.linkedin,
        phone: guest.phone, position: guest.jobPosition, profileType: guest.profileType,
        source: guest.source,
        networking: {
          status: guest.networkingStatus, excludedAt: guest.networkingExcludedAt?.toISOString() ?? null,
          reason: guest.networkingExclusionReason, version: guest.networkingVersion,
        },
        profile: {
          version: guest.profileVersion,
          completeness: profileCompleteness(guest, presenceByGuest.get(guest.id) ?? EMPTY_PRESENCE),
        },
      })),
      imports: imports.map((batch) => ({
        id: batch.id, eventId: batch.eventId, fileName: batch.fileName,
        importedCount: batch.importedCount, storedCount: batch.storedCount,
        duplicateCount: batch.duplicateCount, blankCount: batch.blankCount,
        vipCount: batch.vipCount, sponsorCount: batch.sponsorCount,
        importedAt: batch.importedAt.toISOString(),
      })),
      importCount: importTotals[0]?.total ?? 0,
      matchBlocks: matchBlocks.map((block) => ({
        id: block.id, guestIds: [block.guestLowId, block.guestHighId], reason: block.reason,
        createdAt: block.createdAt.toISOString(),
      })),
    },
    staff: staff.map((member) => ({ id: member.id, name: member.name, role: member.role, avatar: member.avatar ?? "" })),
  };
}

export async function findCover(eventId: string, organizationId: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const [row] = await getDatabase().select({ bytes: eventCovers.bytes, mimeType: eventCovers.mimeType })
    .from(eventCovers).innerJoin(events, eq(eventCovers.eventId, events.id))
    .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId))).limit(1);
  return row ? { bytes: row.bytes, mimeType: row.mimeType } : null;
}

export type EventSummaryRow = {
  id: string; name: string; city: string; venue: string | null;
  startDate: string; endDate: string; timezone: string;
  startsAt: Date; endsAt: Date; guestCount: number; hasCover: boolean;
};

/** Organization-wide organizer events plus explicitly granted operator events. */
export async function listForUser(userId: string, organizationId: string): Promise<EventSummaryRow[]> {
  return getDatabase().select({
    id: events.id, name: events.name, city: events.city, venue: events.venue,
    startDate: events.startDate, endDate: events.endDate, timezone: events.timezone,
    startsAt: events.startsAt, endsAt: events.endsAt,
    guestCount: sql<number>`(select count(*)::int from ${eventGuests} where ${eventGuests.eventId} = ${events.id})`,
    hasCover: sql<boolean>`exists (select 1 from ${eventCovers} where ${eventCovers.eventId} = ${events.id})`,
  }).from(events)
    .innerJoin(organizationMemberships, and(
      eq(organizationMemberships.organizationId, events.organizationId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.active, true),
      or(
        inArray(organizationMemberships.role, ["owner", "organizer"]),
        sql`exists (select 1 from ${eventStaff} where ${eventStaff.eventId} = ${events.id} and ${eventStaff.organizationId} = ${events.organizationId} and ${eventStaff.membershipId} = ${organizationMemberships.id} and ${eventStaff.consoleAccess} = 'operator')`,
      ),
    ))
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.startsAt));
}
