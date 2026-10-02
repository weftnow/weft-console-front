import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationMemberships, users } from "@/infrastructure/database/schema/identity";
import { eventAttendeeImports, eventCovers, eventGuests, events, eventStaff } from "@/infrastructure/database/schema/events";
import { canAssignStaff, canCreateEvent } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";
import type { EventDetailDto } from "../event-dto";
import type { PreparedEvent } from "./service";

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
    if (imported) await tx.insert(eventAttendeeImports).values({
      eventId: inserted.id, fileName: imported.fileName, importedCount: imported.attendees,
      storedCount: imported.storedGuests, vipCount: imported.vips, sponsorCount: imported.sponsors,
    });
    if (guests.length) await tx.insert(eventGuests).values(guests.map((guest, position) => ({
      eventId: inserted.id, position, firstName: guest.firstName, lastName: guest.lastName,
      email: guest.email, normalizedEmail: guest.email || null, phone: guest.phone,
      company: guest.company, jobPosition: guest.position, profileType: guest.profileType,
      linkedin: guest.linkedin, guestType: guest.guestType, source: guest.source,
    })));
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
  const [guests, imports, staff, covers] = await Promise.all([
    database.select().from(eventGuests).where(eq(eventGuests.eventId, eventId)).orderBy(eventGuests.position),
    database.select().from(eventAttendeeImports).where(eq(eventAttendeeImports.eventId, eventId)).limit(1),
    database.select({ id: organizationMemberships.id, name: users.displayName, role: organizationMemberships.role, avatar: users.avatarUrl })
      .from(eventStaff)
      .innerJoin(organizationMemberships, eq(eventStaff.membershipId, organizationMemberships.id))
      .innerJoin(users, eq(organizationMemberships.userId, users.id))
      .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.organizationId, organizationId))),
    database.select({ eventId: eventCovers.eventId }).from(eventCovers).where(eq(eventCovers.eventId, eventId)).limit(1),
  ]);
  const imported = imports[0];
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
      guests: guests.map((guest) => ({
        company: guest.company, email: guest.email, firstName: guest.firstName,
        guestType: guest.guestType, lastName: guest.lastName, linkedin: guest.linkedin,
        phone: guest.phone, position: guest.jobPosition, profileType: guest.profileType,
        source: guest.source,
      })),
      imported: imported ? {
        attendees: imported.importedCount, fileName: imported.fileName,
        sponsors: imported.sponsorCount, storedGuests: imported.storedCount,
        vips: imported.vipCount,
      } : null,
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
