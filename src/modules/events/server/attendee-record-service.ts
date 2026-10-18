import "server-only";
import { and, eq, inArray, ne, or, type SQL } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import type { WeftDatabase } from "@/infrastructure/database/client";
import { eventGuests, events } from "@/infrastructure/database/schema/events";
import { organizationMemberships } from "@/infrastructure/database/schema/identity";
import { ApplicationError } from "@/shared/lib/application-error";
import { attendeeReplacementSchema, attendeeLinkSchema } from "../attendee-record-schemas";
import { uuidSchema, zodFieldErrors } from "../event-schemas";
import { normalizeLinkedin } from "../guest-csv-core";
import { normalizeAttendeePhone, normalizeAttendeeEmail } from "../attendee-contact";

type GuestRow = typeof eventGuests.$inferSelect;
type Transaction = Parameters<Parameters<WeftDatabase["transaction"]>[0]>[0];
const managerRole = (role: string | undefined) => role === "owner" || role === "organizer";

function toSnapshot(guest: GuestRow) {
  return {
    id: guest.id, personId: guest.personId, revision: guest.revision,
    firstName: guest.firstName, lastName: guest.lastName, email: guest.email,
    phone: guest.phone, company: guest.company, position: guest.jobPosition,
    profileType: guest.profileType, guestType: guest.guestType, linkedin: guest.linkedin,
    source: guest.source, importId: guest.importId,
    createdAt: guest.createdAt.toISOString(), updatedAt: guest.updatedAt.toISOString(),
  };
}

async function lockManager(tx: Transaction, eventId: string, userId: string) {
  const [initial] = await tx.select({ organizationId: events.organizationId })
    .from(events).where(eq(events.id, eventId)).limit(1);
  if (!initial) return { kind: "missing" as const };
  const [membership] = await tx.select({ id: organizationMemberships.id, userId: organizationMemberships.userId, role: organizationMemberships.role, active: organizationMemberships.active })
    .from(organizationMemberships).where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, initial.organizationId))).for("update").limit(1);
  const [event] = await tx.select({ id: events.id, organizationId: events.organizationId }).from(events).where(eq(events.id, eventId)).for("update").limit(1);
  if (!event || event.organizationId !== initial.organizationId) return { kind: "missing" as const };
  if (!membership?.active || !managerRole(membership.role)) return { kind: "denied" as const };
  return { kind: "authorized" as const, event, membership };
}

export async function replaceAttendee({ eventId, guestId, userId, data }: { eventId: string; guestId: string; userId: string; data: unknown }) {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(guestId).success) throw new ApplicationError("NOT_FOUND", "Attendee not found.");
  const parsed = attendeeReplacementSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the attendee details.", zodFieldErrors(parsed.error));
  let linkedin: string;
  try { linkedin = parsed.data.linkedin ? normalizeLinkedin(parsed.data.linkedin) : ""; }
  catch { throw new ApplicationError("VALIDATION_ERROR", "Check the attendee details.", { linkedin: "Enter a valid LinkedIn profile URL." }); }
  const input = parsed.data;
  const database = getDatabase();
  const result = await database.transaction(async (tx) => {
    const access = await lockManager(tx, eventId, userId);
    if (access.kind !== "authorized") return access;
    const [guest] = await tx.select().from(eventGuests).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId))).for("update").limit(1);
    if (!guest) return { kind: "missing" as const };
    if (guest.revision !== input.expectedRevision) return { kind: "conflict" as const, current: toSnapshot(guest) };
    const now = new Date();
    const [saved] = await tx.update(eventGuests).set({
      firstName: input.firstName, lastName: input.lastName,
      email: input.email.toLowerCase(), normalizedEmail: input.email ? input.email.toLowerCase() : null,
      phone: input.phone, normalizedPhone: normalizeAttendeePhone(input.phone), company: input.company,
      jobPosition: input.position, profileType: input.profileType, guestType: input.guestType,
      linkedin, revision: guest.revision + 1, updatedAt: now,
    }).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId), eq(eventGuests.revision, input.expectedRevision))).returning();
    return saved ? { kind: "saved" as const, guest: toSnapshot(saved) } : { kind: "conflict" as const, current: toSnapshot(guest) };
  });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Attendee not found.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage attendees for this event.");
  if (result.kind === "conflict") throw new ApplicationError("CONFLICT", "This attendee changed after you opened the editor. Review the latest saved details before resubmitting.", undefined, { kind: "STALE_VERSION", current: result.current });
  return result.guest;
}

export async function findAttendeeCandidates({ eventId, guestId, userId }: { eventId: string; guestId: string; userId: string }) {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(guestId).success) throw new ApplicationError("NOT_FOUND", "Attendee not found.");
  const database = getDatabase();
  const result = await database.transaction(async (tx) => {
    const access = await lockManager(tx, eventId, userId);
    if (access.kind !== "authorized") return access;
    const [guest] = await tx.select().from(eventGuests).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId))).limit(1);
    if (!guest) return { kind: "missing" as const };
    const predicates: SQL[] = [];
    if (guest.normalizedEmail && normalizeAttendeeEmail(guest.email)) predicates.push(eq(eventGuests.normalizedEmail, guest.normalizedEmail));
    if (guest.normalizedPhone) predicates.push(eq(eventGuests.normalizedPhone, guest.normalizedPhone));
    if (!predicates.length) return { kind: "authorized" as const, candidates: [] };
    const rows = await tx.select().from(eventGuests).where(and(
      eq(eventGuests.eventId, eventId), ne(eventGuests.id, guestId), ne(eventGuests.personId, guest.personId), or(...predicates),
    ));
    return { kind: "authorized" as const, candidates: rows.map((candidate) => ({
      guestId: candidate.id, personId: candidate.personId, revision: candidate.revision,
      firstName: candidate.firstName, lastName: candidate.lastName, email: candidate.email,
      phone: candidate.phone, company: candidate.company,
      reasons: [
        ...(guest.normalizedEmail && guest.normalizedEmail === candidate.normalizedEmail ? ["email" as const] : []),
        ...(guest.normalizedPhone && guest.normalizedPhone === candidate.normalizedPhone ? ["phone" as const] : []),
      ],
    })) };
  });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Attendee not found.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage attendees for this event.");
  return result.candidates;
}

export async function linkAttendees({ eventId, userId, data }: { eventId: string; userId: string; data: unknown }) {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const parsed = attendeeLinkSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Choose two attendee records to link.", zodFieldErrors(parsed.error));
  if (parsed.data.duplicateGuestId === parsed.data.canonicalGuestId) throw new ApplicationError("VALIDATION_ERROR", "An attendee cannot be linked to itself.");
  const database = getDatabase();
  const result = await database.transaction(async (tx) => {
    const access = await lockManager(tx, eventId, userId);
    if (access.kind !== "authorized") return access;
    const ids = [parsed.data.duplicateGuestId, parsed.data.canonicalGuestId].sort();
    const rows = await tx.select().from(eventGuests).where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, ids))).orderBy(eventGuests.id).for("update");
    const duplicate = rows.find((row) => row.id === parsed.data.duplicateGuestId);
    const canonical = rows.find((row) => row.id === parsed.data.canonicalGuestId);
    if (!duplicate || !canonical) return { kind: "missing" as const };
    if (duplicate.personId === canonical.personId) return { kind: "already-linked" as const, personId: canonical.personId };
    const sameEmail = Boolean(duplicate.normalizedEmail && normalizeAttendeeEmail(duplicate.email) && duplicate.normalizedEmail === canonical.normalizedEmail);
    const samePhone = Boolean(duplicate.normalizedPhone && duplicate.normalizedPhone === canonical.normalizedPhone);
    if (!sameEmail && !samePhone) return { kind: "no-longer-matched" as const };
    const linkedGuestIds = await tx.select({ id: eventGuests.id }).from(eventGuests)
      .where(and(eq(eventGuests.eventId, eventId), eq(eventGuests.personId, duplicate.personId)));
    await tx.update(eventGuests).set({ personId: canonical.personId })
      .where(and(eq(eventGuests.eventId, eventId), eq(eventGuests.personId, duplicate.personId)));
    return { kind: "linked" as const, personId: canonical.personId, linkedGuestIds: linkedGuestIds.map((row) => row.id) };
  });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Attendee not found in this event.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage attendees for this event.");
  if (result.kind === "no-longer-matched") throw new ApplicationError("CONFLICT", "These attendee records no longer share an exact normalized email or phone match.", undefined, { kind: "CONTACT_MATCH_CHANGED" });
  if (result.kind === "already-linked") return { personId: result.personId, linked: false };
  return { personId: result.personId, linkedGuestIds: result.linkedGuestIds, linked: true };
}
