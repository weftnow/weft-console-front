import "server-only";
import { and, count, eq, inArray, max } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationMemberships } from "@/infrastructure/database/schema/identity";
import { eventAttendeeImports, eventGuests, events } from "@/infrastructure/database/schema/events";
import type { AttendeeImportDto } from "../attendee-import-schemas";
import type { EventRosterSnapshot, ImportAttendeesResult, ImportDecision, PreparedCsvImport } from "../attendee-import-types";
import type { EventGuestRecord } from "../event-record";

type ImportArgs = { userId: string; eventId: string; prepared: PreparedCsvImport };
type Decide = (snapshot: EventRosterSnapshot) => ImportDecision;

function toDto(batch: typeof eventAttendeeImports.$inferSelect): AttendeeImportDto {
  return {
    id: batch.id,
    eventId: batch.eventId,
    fileName: batch.fileName,
    importedCount: batch.importedCount,
    storedCount: batch.storedCount,
    duplicateCount: batch.duplicateCount,
    blankCount: batch.blankCount,
    vipCount: batch.vipCount,
    sponsorCount: batch.sponsorCount,
    importedAt: batch.importedAt.toISOString(),
  };
}

function guestInsert(eventId: string, importId: string, guest: EventGuestRecord, position: number) {
  return {
    eventId, importId, position,
    firstName: guest.firstName, lastName: guest.lastName,
    email: guest.email, normalizedEmail: guest.email || null,
    phone: guest.phone, company: guest.company, jobPosition: guest.position,
    profileType: guest.profileType, linkedin: guest.linkedin,
    guestType: guest.guestType, source: "csv" as const,
  };
}

export async function withLockedEventRoster({ userId, eventId, prepared }: ImportArgs, decide: Decide): Promise<ImportAttendeesResult> {
  const database = getDatabase();
  return database.transaction(async (tx) => {
    const [initialEvent] = await tx.select({ organizationId: events.organizationId })
      .from(events).where(eq(events.id, eventId)).limit(1);
    if (!initialEvent) return decisionResult(decide({
      membership: null, event: null, existingCount: 0, maxPosition: -1,
      existingEmails: new Set(), matchingImport: null,
    }));

    const [membership] = await tx.select({ active: organizationMemberships.active, role: organizationMemberships.role })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, initialEvent.organizationId)))
      .for("update").limit(1);
    const [lockedEvent] = await tx.select({ id: events.id, organizationId: events.organizationId })
      .from(events).where(eq(events.id, eventId)).for("update").limit(1);

    if (!lockedEvent || lockedEvent.organizationId !== initialEvent.organizationId) {
      return decisionResult(decide({
        membership: membership ?? null, event: null, existingCount: 0, maxPosition: -1,
        existingEmails: new Set(), matchingImport: null,
      }));
    }

    const candidateEmails = [...new Set(prepared.guests.map((guest) => guest.email).filter(Boolean))];
    const [roster, matchingRows, matchingEmails] = await Promise.all([
      tx.select({ count: count(), maxPosition: max(eventGuests.position) })
        .from(eventGuests).where(eq(eventGuests.eventId, eventId)),
      tx.select().from(eventAttendeeImports).where(and(
        eq(eventAttendeeImports.eventId, eventId),
        eq(eventAttendeeImports.fingerprintVersion, 1),
        eq(eventAttendeeImports.contentHash, prepared.contentHash),
      )).limit(1),
      candidateEmails.length
        ? tx.select({ normalizedEmail: eventGuests.normalizedEmail }).from(eventGuests).where(and(
          eq(eventGuests.eventId, eventId), inArray(eventGuests.normalizedEmail, candidateEmails),
        ))
        : Promise.resolve([]),
    ]);
    const snapshot: EventRosterSnapshot = {
      membership: membership ?? null,
      event: { id: lockedEvent.id, organizationId: lockedEvent.organizationId },
      existingCount: roster[0]?.count ?? 0,
      maxPosition: roster[0]?.maxPosition ?? -1,
      existingEmails: new Set(matchingEmails.map((row) => row.normalizedEmail).filter((email): email is string => Boolean(email))),
      matchingImport: matchingRows[0] ? toDto(matchingRows[0]) : null,
    };
    const decision = decide(snapshot);
    if (decision.kind === "replay") return { import: decision.import, replayed: true };

    const [batch] = await tx.insert(eventAttendeeImports).values({
      eventId, importedBy: userId, fileName: prepared.fileName,
      contentHash: prepared.contentHash, fingerprintVersion: 1,
      importedCount: decision.counts.importedCount,
      storedCount: decision.counts.storedCount,
      duplicateCount: decision.counts.duplicateCount,
      blankCount: decision.counts.blankCount,
      vipCount: decision.counts.vipCount,
      sponsorCount: decision.counts.sponsorCount,
    }).returning();
    if (decision.guests.length) {
      await tx.insert(eventGuests).values(decision.guests.map((guest, index) => guestInsert(eventId, batch.id, guest, decision.firstPosition + index)));
    }
    const now = new Date();
    await tx.update(events).set({ updatedAt: now }).where(eq(events.id, eventId));
    return { import: toDto(batch), replayed: false };
  });
}

function decisionResult(decision: ImportDecision): ImportAttendeesResult {
  if (decision.kind === "replay") return { import: decision.import, replayed: true };
  throw new Error("An event roster append decision cannot be persisted without a locked event.");
}
