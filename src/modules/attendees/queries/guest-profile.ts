import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { profileResultSchema } from "../profile-schemas";
import type { ProfileRead } from "../profile-schemas";
import { sendJson, toApplicationError } from "../mutations/api-error";

export async function fetchGuestProfile(eventId: string, guestId: string, fetcher: typeof fetch = fetch): Promise<ProfileRead> {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(guestId).success) {
    throw new ApplicationError("VALIDATION_ERROR", "Choose a valid guest.");
  }
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/guests/${guestId}/profile`, {
    method: "GET", cache: "no-store",
  }, "Could not reach the server. Try again.");
  if (!response.ok) throw toApplicationError(json, "The server could not load this profile. Try again.");
  const result = profileResultSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid profile. Try again.");
  return result.data.data;
}
