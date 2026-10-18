import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchBlockInputSchema, matchBlockResultSchema } from "../networking-schemas";
import type { MatchBlockDto } from "../networking-schemas";
import { sendJson, toApplicationError } from "./api-error";

export async function submitMatchBlock(
  eventId: string,
  input: { guestIds: [string, string]; reason?: string },
  fetcher: typeof fetch = fetch,
): Promise<MatchBlockDto> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid event.");
  const parsedInput = matchBlockInputSchema.safeParse(input);
  if (!parsedInput.success) throw new ApplicationError("VALIDATION_ERROR", "Choose two different guests.");
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/match-blocks`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsedInput.data),
  }, "Could not reach the server. The pair was not saved; try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not save this pair. Try again.");
  const result = matchBlockResultSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid result. Refresh to see the saved state.");
  return result.data.data.matchBlock;
}

export async function deleteMatchBlock(eventId: string, blockId: string, fetcher: typeof fetch = fetch): Promise<void> {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(blockId).success) {
    throw new ApplicationError("VALIDATION_ERROR", "Choose a valid pair.");
  }
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/match-blocks/${blockId}`, { method: "DELETE" },
    "Could not reach the server. The pair was not removed; try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not remove this pair. Try again.");
}
