import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { sendJson, toApplicationError } from "@/modules/attendees/mutations/api-error";
import { matchingStatusResponseSchema, type MatchingStatusResult } from "../matching-status-schemas";

export async function fetchEventMatchingStatus(eventId: string, fetcher: typeof fetch = fetch): Promise<MatchingStatusResult> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid event.");
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/matching-status`, {
    method: "GET", cache: "no-store",
  }, "Could not reach the server. Try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not load the matching status. Try again.");
  const result = matchingStatusResponseSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid matching status. Try again.");
  return result.data.data;
}
