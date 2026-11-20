import { z } from "zod";

export const matchCompletionInputSchema = z.strictObject({
  completed: z.boolean(),
  expectedRevision: z.number().int().min(0).max(2_147_483_647),
});

export const matchCompletionResponseSchema = z.object({
  data: z.object({ completion: z.object({
    trackingStartedAt: z.iso.datetime().nullable(),
    completedAt: z.iso.datetime().nullable(),
    revision: z.number().int().nonnegative(),
  }) }),
});
