import "server-only";
import { createEventSchema, uuidSchema, zodFieldErrors } from "../event-schemas";
import { resolveEventSchedule } from "../event-schedule";
import type { EventDetailDto } from "../event-dto";
import type { EventGuestRecord } from "../event-record";
import { normalizeLinkedin, GuestCsvError } from "../guest-csv-core";
import { parseGuestCsvServer } from "./guest-csv-server";
import { normalizeCover } from "./cover-image";
import * as repository from "./repository";
import { requireEventCreator } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";

export type PreparedEvent = {
  userId: string;
  organizationId: string;
  data: ReturnType<typeof createEventSchema.parse>;
  schedule: ReturnType<typeof resolveEventSchedule>;
  guests: EventGuestRecord[];
  imported: { attendees: number; fileName: string; sponsors: number; storedGuests: number; vips: number } | null;
  cover: Awaited<ReturnType<typeof normalizeCover>> | null;
};

type CreateDependencies = {
  requireCreator: typeof requireEventCreator;
  create: (prepared: PreparedEvent) => Promise<EventDetailDto>;
};

export async function createEvent(
  { userId, organizationId, data }: { userId: string; organizationId: string; data: unknown },
  dependencies: CreateDependencies = { requireCreator: requireEventCreator, create: repository.create },
): Promise<EventDetailDto> {
  const parsed = createEventSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the highlighted fields.", zodFieldErrors(parsed.error));
  if (parsed.data.organizationId !== organizationId) throw new ApplicationError("VALIDATION_ERROR", "Check the selected organization.", { organizationId: "Organization selection changed." });
  await dependencies.requireCreator({ userId, organizationId });
  const schedule = resolveEventSchedule(parsed.data);
  let csv: ReturnType<typeof parseGuestCsvServer> | null = null;
  if (parsed.data.attendeeImport) {
    try { csv = parseGuestCsvServer(parsed.data.attendeeImport.csvText); }
    catch (error) {
      if (error instanceof GuestCsvError) throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", { "attendeeImport.csvText": error.message });
      throw error;
    }
  }
  const guests: EventGuestRecord[] = [];
  const emails = new Set<string>();
  for (const [index, guest] of [...(csv?.guests ?? []), ...parsed.data.manualGuests.map((manual): EventGuestRecord => ({ ...manual, source: "manual" }))].entries()) {
    let linkedin: string;
    try { linkedin = normalizeLinkedin(guest.linkedin); }
    catch { throw new ApplicationError("VALIDATION_ERROR", "Check the guest list.", { [guest.source === "csv" ? "attendeeImport.csvText" : `manualGuests.${index - (csv?.guests.length ?? 0)}.linkedin`]: "Enter a valid LinkedIn profile URL." }); }
    const email = guest.email.trim().toLowerCase();
    const field = guest.source === "csv" ? "attendeeImport.csvText" : `manualGuests.${index - (csv?.guests.length ?? 0)}.email`;
    if (email && emails.has(email)) throw new ApplicationError("VALIDATION_ERROR", "Duplicate guest email.", { [field]: guest.source === "csv" ? `Row ${csv?.guestRows[index] ?? index + 2}: each initial guest email must be unique.` : "Each initial guest email must be unique." });
    if (email) emails.add(email);
    guests.push({ ...guest, email, linkedin });
  }
  if (guests.length > 2000) throw new ApplicationError("VALIDATION_ERROR", "Too many initial guests.", { attendeeImport: "The combined initial guest list is limited to 2,000 people." });
  const cover = parsed.data.coverImage ? await normalizeCover(parsed.data.coverImage) : null;
  const imported = csv && parsed.data.attendeeImport ? {
    attendees: csv.rows, fileName: parsed.data.attendeeImport.fileName,
    sponsors: csv.sponsors, storedGuests: csv.guests.length, vips: csv.vips,
  } : null;
  return dependencies.create({ userId, organizationId, data: parsed.data, schedule, guests, imported, cover });
}

type ReadDependencies = {
  findOrganizationId: typeof repository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  findById: typeof repository.findById;
  findCover: typeof repository.findCover;
};

export async function getEvent(
  { userId, eventId }: { userId: string; eventId: string },
  dependencies: ReadDependencies = { ...repository, requireCreator: requireEventCreator },
): Promise<EventDetailDto> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  const event = await dependencies.findById(eventId, organizationId);
  if (!event) throw new ApplicationError("NOT_FOUND", "Event not found.");
  return event;
}

export async function getEventCover(
  { userId, eventId }: { userId: string; eventId: string },
  dependencies: ReadDependencies = { ...repository, requireCreator: requireEventCreator },
) {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  const cover = await dependencies.findCover(eventId, organizationId);
  if (!cover) throw new ApplicationError("NOT_FOUND", "Cover not found.");
  return cover;
}
