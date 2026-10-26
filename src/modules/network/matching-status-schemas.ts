import { z } from "zod";
import { uuidSchema } from "@/modules/events/event-schemas";

export const MATCHING_STATES = ["idle", "waiting", "running", "failed", "finished", "invalid_result"] as const;
export const matchingStateSchema = z.enum(MATCHING_STATES);
export type MatchingState = z.infer<typeof matchingStateSchema>;

const timestampSchema = z.iso.datetime({ offset: true });
const runStatusSchema = z.enum(["waiting", "running", "failed", "finished", "invalid_result"]);

/** Matching engine contract. Extra engine fields are ignored; failure messages are never forwarded. */
export const engineMatchingStatusSchema = z.object({
  state: matchingStateSchema,
  pendingChanges: z.number().int().min(0),
  latestRun: z.object({
    runId: uuidSchema,
    status: runStatusSchema,
    trigger: z.enum(["api", "change"]),
    failure: z.object({ code: z.string().max(80) }).nullable(),
    createdAt: timestampSchema,
    finishedAt: timestampSchema.nullable(),
  }).nullable(),
  lastFinishedRunId: uuidSchema.nullable(),
  nextAttemptAt: timestampSchema.nullable(),
  automaticEnabled: z.boolean(),
});

export type MatchingStatusDto = z.infer<typeof engineMatchingStatusSchema>;

export const MATCHING_UNAVAILABLE_REASONS = ["not_configured", "unreachable", "invalid_response"] as const;

export const matchingStatusResultSchema = z.discriminatedUnion("availability", [
  z.strictObject({ availability: z.literal("available"), status: engineMatchingStatusSchema.strict(), simulated: z.literal(true).optional() }),
  z.strictObject({ availability: z.literal("unavailable"), reason: z.enum(MATCHING_UNAVAILABLE_REASONS) }),
]);
export type MatchingStatusResult = z.infer<typeof matchingStatusResultSchema>;

export const matchingStatusResponseSchema = z.strictObject({ data: matchingStatusResultSchema });
