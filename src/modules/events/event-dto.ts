import { z } from "zod";
import { EVENT_AUDIENCE_OPTIONS, EVENT_CATEGORIES, EVENT_CITIES } from "./event-options";
import { attendeeImportDtoSchema } from "./attendee-import-schemas";
import { localeSchema } from "@/shared/i18n/locales";
import { guestTypeSchema, uuidSchema } from "./event-schemas";
import { exclusionReasonSchema, matchBlockDtoSchema } from "@/modules/attendees/networking-schemas";
import { profileCompletenessSchema } from "@/modules/attendees/profile-schemas";

const guestSchema = z.strictObject({
  id: uuidSchema,
  company: z.string(), email: z.string(), firstName: z.string(),
  guestType: guestTypeSchema, lastName: z.string(), linkedin: z.string(),
  phone: z.string(), position: z.string(), profileType: z.string(),
  source: z.enum(["csv", "manual"]),
  importId: uuidSchema.nullable(),
  personId: uuidSchema,
  revision: z.number().int().min(1),
  networking: z.strictObject({
    status: z.enum(["included", "excluded"]),
    excludedAt: z.iso.datetime().nullable(),
    reason: exclusionReasonSchema.nullable(),
    version: z.number().int().min(1),
  }),
  /** Light summary only; the full text loads from the profile endpoint. */
  profile: z.strictObject({ version: z.number().int().min(0), completeness: profileCompletenessSchema }),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});

// Corrections return contact details only; independent networking/profile state stays in its own DTOs.
export const savedEventGuestDtoSchema = guestSchema.omit({ networking: true, profile: true });

export const eventDetailDtoSchema = z.strictObject({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string(), city: z.enum(EVENT_CITIES), venue: z.string(),
  description: z.string(), expectedAttendees: z.number().int().nullable(),
  categories: z.array(z.enum(EVENT_CATEGORIES)),
  expectedAudience: z.array(z.enum(EVENT_AUDIENCE_OPTIONS)),
  startDate: z.string(), endDate: z.string(), startTime: z.string(), endTime: z.string(),
  timezone: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(),
  language: localeSchema,
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  coverImage: z.string().nullable(),
  attendees: z.strictObject({
    canManage: z.boolean(),
    guests: z.array(guestSchema),
    imports: z.array(attendeeImportDtoSchema).max(20),
    importCount: z.number().int().min(0),
    matchBlocks: z.array(matchBlockDtoSchema),
  }),
  staff: z.array(z.strictObject({ id: uuidSchema, name: z.string(), role: z.string(), avatar: z.string() })),
}).superRefine((event, ctx) => {
  if (event.coverImage !== null && event.coverImage !== `/api/events/${event.id}/cover`) {
    ctx.addIssue({ code: "custom", path: ["coverImage"], message: "Cover URL must be the protected event endpoint." });
  }
});

export const eventDetailResponseSchema = z.strictObject({
  data: z.strictObject({ event: eventDetailDtoSchema }),
});

export const createEventResponseSchema = eventDetailResponseSchema;

export type EventDetailDto = z.infer<typeof eventDetailDtoSchema>;

export type EventSummaryDto = {
  id: string; name: string; city: string; venue: string;
  startDate: string; endDate: string; startsAt: string; endsAt: string; timezone: string;
  guestCount: number; coverImage: string | null;
  status: "upcoming" | "live" | "completed";
};
