import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { sendJson, toApplicationError } from "@/modules/attendees/mutations/api-error";
import { matchDetailResponseSchema, matchListResponseSchema, type MatchDetailDto, type MatchListDto } from "../matches-schemas";

export const eventMatchesKey = (eventId: string) => ["event-matches", eventId] as const;
export const eventMatchKey = (eventId: string, matchId: string) => ["event-match", eventId, matchId] as const;

export async function fetchEventMatches(eventId: string, fetcher: typeof fetch = fetch): Promise<MatchListDto> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid event.");
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/matches`, { method: "GET", cache: "no-store" }, "Could not reach the server. Try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not load the matches. Try again.");
  const result = matchListResponseSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned invalid matches. Try again.");
  return result.data.data;
}

export async function fetchEventMatch(eventId: string, matchId: string, fetcher: typeof fetch = fetch): Promise<MatchDetailDto> {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(matchId).success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid match.");
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/matches/${matchId}`, { method: "GET", cache: "no-store" }, "Could not reach the server. Try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not load this match. Try again.");
  const result = matchDetailResponseSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid match. Try again.");
  return result.data.data.match;
}
