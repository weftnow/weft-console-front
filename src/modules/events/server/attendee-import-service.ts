import "server-only";
import { createHash } from "node:crypto";
import { ApplicationError } from "@/shared/lib/application-error";
import { requireEventCreator } from "@/modules/organizations/service";
import { uuidSchema } from "../event-schemas";
import { attendeeImportInputSchema } from "../attendee-import-schemas";
import type { AttendeeImportInput } from "../attendee-import-schemas";
import type { EventRosterSnapshot, ImportDecision, ImportAttendeesResult, PreparedCsvImport } from "../attendee-import-types";
import { GuestCsvError } from "../guest-csv-core";
import { parseGuestCsvServer } from "./guest-csv-server";
import * as eventRepository from "./repository";

function fingerprintGuests(guests: PreparedCsvImport["guests"]): string {
  const tuples = guests.map((guest) => [
    guest.firstName, guest.lastName, guest.email, guest.phone, guest.company,
    guest.position, guest.profileType, guest.linkedin, guest.guestType,
  ]);
  return createHash("sha256").update(JSON.stringify(tuples), "utf8").digest("hex");
}

export function prepareCsvImport(input: unknown): PreparedCsvImport {
  const parsedInput = attendeeImportInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const fields = Object.fromEntries(parsedInput.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
    throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", fields);
  }
  let parsed: ReturnType<typeof parseGuestCsvServer>;
  try { parsed = parseGuestCsvServer(parsedInput.data.csvText); }
  catch (error) {
    if (error instanceof GuestCsvError) throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", error.fields ?? { csvText: error.message });
    throw error;
  }
  const guests = parsed.guests.map((guest) => ({ ...guest, email: guest.email.trim().toLowerCase() }));
  return {
    blankCount: parsed.blankCount,
    contentHash: fingerprintGuests(guests),
    fileName: parsedInput.data.fileName,
    guests,
    guestRows: parsed.guestRows,
    importedCount: guests.length,
    sponsorCount: guests.filter((guest) => guest.guestType === "Sponsor").length,
    vipCount: guests.filter((guest) => guest.guestType === "VIP").length,
  };
}

export function decideAttendeeAppend(snapshot: EventRosterSnapshot, prepared: PreparedCsvImport): ImportDecision {
  if (!snapshot.event) throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (!snapshot.membership?.active || !["owner", "organizer"].includes(snapshot.membership.role)) {
    throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization.");
  }
  if (snapshot.matchingImport) return { kind: "replay", import: snapshot.matchingImport };

  const guests = prepared.guests.filter((guest) => !guest.email || !snapshot.existingEmails.has(guest.email));
  const duplicateCount = prepared.importedCount - guests.length;
  const remainingCapacity = Math.max(0, 2000 - snapshot.existingCount);
  if (snapshot.existingCount + guests.length > 2000) {
    throw new ApplicationError("VALIDATION_ERROR", "The attendee roster is full.", {
      csvText: `The roster has ${snapshot.existingCount} attendees, ${remainingCapacity} spaces remain, and this import would add ${guests.length}.`,
    });
  }
  return {
    kind: "append",
    guests,
    firstPosition: snapshot.maxPosition + 1,
    counts: {
      importedCount: prepared.importedCount,
      storedCount: guests.length,
      duplicateCount,
      blankCount: prepared.blankCount,
      vipCount: guests.filter((guest) => guest.guestType === "VIP").length,
      sponsorCount: guests.filter((guest) => guest.guestType === "Sponsor").length,
    },
  };
}

type ImportDependencies = {
  findOrganizationId: typeof eventRepository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  withLockedEventRoster: (args: { userId: string; eventId: string; prepared: PreparedCsvImport }, decide: (snapshot: EventRosterSnapshot) => ImportDecision) => Promise<ImportAttendeesResult>;
};

export async function importAttendees(
  { userId, eventId, data }: { userId: string; eventId: string; data: unknown },
  dependencies: ImportDependencies = {
    findOrganizationId: eventRepository.findOrganizationId,
    requireCreator: requireEventCreator,
    withLockedEventRoster: async (args, decide) => {
      const repository = await import("./attendee-import-repository");
      return repository.withLockedEventRoster(args, decide);
    },
  },
): Promise<ImportAttendeesResult> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const parsed = attendeeImportInputSchema.safeParse(data);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
    throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", fields);
  }
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  const prepared = prepareCsvImport(parsed.data as AttendeeImportInput);
  return dependencies.withLockedEventRoster({ userId, eventId, prepared }, (snapshot) => decideAttendeeAppend(snapshot, prepared));
}
