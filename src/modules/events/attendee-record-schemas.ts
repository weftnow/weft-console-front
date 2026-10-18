import { z } from "zod";
import { guestTypeSchema, uuidSchema } from "./event-schemas";

export const attendeeReplacementSchema = z.strictObject({
  expectedRevision: z.number().int().min(1),
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().max(254),
  phone: z.string().trim().max(40),
  company: z.string().trim().max(200),
  position: z.string().trim().max(200),
  profileType: z.string().trim().max(100),
  guestType: guestTypeSchema,
  linkedin: z.string().trim().max(500),
}).superRefine((guest, ctx) => {
  if (!guest.firstName && !guest.lastName) ctx.addIssue({ code: "custom", path: ["firstName"], message: "Add at least one name." });
});

export const attendeeLinkSchema = z.strictObject({
  duplicateGuestId: uuidSchema,
  canonicalGuestId: uuidSchema,
});

export const attendeeCandidateResponseSchema = z.strictObject({
  data: z.strictObject({ candidates: z.array(z.strictObject({
    guestId: uuidSchema,
    firstName: z.string(), lastName: z.string(), email: z.string(), phone: z.string(),
    company: z.string(), personId: uuidSchema, revision: z.number().int().min(1),
    reasons: z.array(z.enum(["email", "phone"])).min(1),
  })) }),
});

export type AttendeeReplacement = z.output<typeof attendeeReplacementSchema>;
