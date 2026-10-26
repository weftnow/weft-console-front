import { z } from "zod";
import { uuidSchema } from "@/modules/events/event-schemas";

export const EXCLUSION_REASONS = ["guest_request", "organizer_decision", "not_attending", "other"] as const;
export const exclusionReasonSchema = z.enum(EXCLUSION_REASONS);
export type ExclusionReason = z.infer<typeof exclusionReasonSchema>;

export const EXCLUSION_REASON_LABELS: Record<ExclusionReason, string> = {
  guest_request: "Guest asked not to be matched",
  organizer_decision: "Organizer decision",
  not_attending: "Not attending the event",
  other: "Other",
};

const expectedVersionSchema = z.number().int().min(1).max(2_147_483_647);

export const participationInputSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("excluded"), reason: exclusionReasonSchema, expectedVersion: expectedVersionSchema }),
  z.strictObject({ status: z.literal("included"), expectedVersion: expectedVersionSchema }),
]);

export const matchBlockReasonSchema = z.string().trim().max(500).transform((value) => value || null);

export const matchBlockInputSchema = z.strictObject({
  guestIds: z.tuple([uuidSchema, uuidSchema]),
  reason: matchBlockReasonSchema.optional(),
}).refine((input) => input.guestIds[0] !== input.guestIds[1], { path: ["guestIds"], message: "Choose two different guests." });

export const participationDtoSchema = z.strictObject({
  guestId: uuidSchema,
  status: z.enum(["included", "excluded"]),
  excludedAt: z.iso.datetime().nullable(),
  reason: exclusionReasonSchema.nullable(),
  version: z.number().int().min(1),
});

export const matchBlockDtoSchema = z.strictObject({
  id: uuidSchema,
  guestIds: z.tuple([uuidSchema, uuidSchema]),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const participationResultSchema = z.strictObject({ data: z.strictObject({ participation: participationDtoSchema }) });
export const participationConflictSchema = z.strictObject({
  error: z.strictObject({ code: z.literal("CONFLICT"), message: z.string() }),
  data: z.strictObject({ participation: participationDtoSchema }),
});
export const matchBlockResultSchema = z.strictObject({ data: z.strictObject({ matchBlock: matchBlockDtoSchema }) });

export type ParticipationInput = z.output<typeof participationInputSchema>;
export type MatchBlockInput = z.output<typeof matchBlockInputSchema>;
export type ParticipationDto = z.infer<typeof participationDtoSchema>;
export type MatchBlockDto = z.infer<typeof matchBlockDtoSchema>;
