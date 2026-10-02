import { z } from "zod";
import { EVENT_AUDIENCE_OPTIONS, EVENT_CATEGORIES, EVENT_CITIES } from "./event-options";
import { attendeeImportDtoSchema } from "./attendee-import-schemas";
import { guestTypeSchema, uuidSchema } from "./event-schemas";

const guestSchema = z.strictObject({
  id: uuidSchema,
  company: z.string(), email: z.string(), firstName: z.string(),
  guestType: guestTypeSchema, lastName: z.string(), linkedin: z.string(),
  phone: z.string(), position: z.string(), profileType: z.string(),
  source: z.enum(["csv", "manual"]),
  importId: uuidSchema.nullable(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});

export const eventDetailDtoSchema = z.strictObject({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string(), city: z.enum(EVENT_CITIES), venue: z.string(),
  description: z.string(), expectedAttendees: z.number().int().nullable(),
  categories: z.array(z.enum(EVENT_CATEGORIES)),
  expectedAudience: z.array(z.enum(EVENT_AUDIENCE_OPTIONS)),
  startDate: z.string(), endDate: z.string(), startTime: z.string(), endTime: z.string(),
  timezone: z.string(), startsAt: z.iso.datetime(), endsAt: z.iso.datetime(),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  coverImage: z.string().nullable(),
  attendees: z.strictObject({
    guests: z.array(guestSchema),
    imports: z.array(attendeeImportDtoSchema).max(20),
    importCount: z.number().int().min(0),
  }),
  staff: z.array(z.strictObject({ id: uuidSchema, name: z.string(), role: z.string(), avatar: z.string() })),
}).superRefine((event, ctx) => {
  if (event.coverImage !== null && event.coverImage !== `/api/events/${event.id}/cover`) {
    ctx.addIssue({ code: "custom", path: ["coverImage"], message: "Cover URL must be the protected event endpoint." });
  }
});

export const createEventResponseSchema = z.strictObject({
  data: z.strictObject({ event: eventDetailDtoSchema }),
});

export type EventDetailDto = z.infer<typeof eventDetailDtoSchema>;
