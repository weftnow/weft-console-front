import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { EVENT_AUDIENCE_OPTIONS, EVENT_CATEGORIES, EVENT_CITIES } from "./event-options";

export const uuidSchema = z.uuid();
const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  try { Temporal.PlainDate.from(value, { overflow: "reject" }); return true; }
  catch { return false; }
}, "Enter a valid calendar date.");
const wallTime = z.union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), z.literal("")]).nullable().transform((value) => value || null);
const unique = <T>(values: T[]) => new Set(values).size === values.length;

export const guestTypeSchema = z.enum(["Attendee", "VIP", "Sponsor"]);
const guestBase = {
  firstName: z.string().trim().max(100).default(""),
  lastName: z.string().trim().max(100).default(""),
  email: z.union([z.email().max(254), z.literal("")]).default(""),
  phone: z.string().trim().max(40).default(""),
  company: z.string().trim().max(200).default(""),
  position: z.string().trim().max(200).default(""),
  profileType: z.string().trim().max(100).default(""),
  linkedin: z.string().trim().max(500).default(""),
  guestType: guestTypeSchema,
};

export const manualGuestSchema = z.strictObject(guestBase).superRefine((guest, ctx) => {
  if (!guest.firstName) ctx.addIssue({ code: "custom", path: ["firstName"], message: "Add a first name." });
  if (!guest.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Add an email address." });
});

export const csvGuestSchema = z.strictObject(guestBase).superRefine((guest, ctx) => {
  if (!guest.firstName && !guest.lastName) ctx.addIssue({ code: "custom", path: ["firstName"], message: "Add a name." });
});

export const createEventSchema = z.strictObject({
  organizationId: uuidSchema,
  name: z.string().trim().min(1).max(160),
  city: z.enum(EVENT_CITIES),
  venue: optionalText(200),
  expectedAttendees: z.number().int().min(0).max(1_000_000).nullable(),
  startDate: calendarDate,
  endDate: calendarDate,
  startTime: wallTime,
  endTime: wallTime,
  description: z.string().trim().min(1).max(500),
  categories: z.array(z.enum(EVENT_CATEGORIES)).min(1).refine(unique, "Choose each category once."),
  expectedAudience: z.array(z.enum(EVENT_AUDIENCE_OPTIONS)).refine(unique, "Choose each audience once."),
  attendeeImport: z.strictObject({
    fileName: z.string().trim().min(1).max(255),
    csvText: z.string().min(1).refine((value) => new TextEncoder().encode(value).byteLength <= 1024 * 1024, "CSV must be 1 MiB or smaller."),
  }).nullable(),
  manualGuests: z.array(manualGuestSchema).max(2000),
  staffMembershipIds: z.array(uuidSchema).refine(unique, "Choose each staff member once."),
  coverImage: z.string().max(2_000_000).nullable(),
}).superRefine((event, ctx) => {
  if (event.endDate < event.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date." });
});

export type CreateEventInput = z.output<typeof createEventSchema>;

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fields[key] ??= issue.message;
  }
  return fields;
}
