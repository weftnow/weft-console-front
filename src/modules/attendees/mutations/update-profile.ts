import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { profileConflictSchema, profileInputSchema, profileResultSchema } from "../profile-schemas";
import type { ProfileDto, ProfileInput, ProfileRead } from "../profile-schemas";
import { sendJson, toApplicationError } from "./api-error";

/** Stale save: the server has a newer profile version for this guest, returned here. */
export class StaleProfileError extends ApplicationError {
  constructor(public readonly latest: ProfileDto, message: string) {
    super("CONFLICT", message);
    this.name = "StaleProfileError";
  }
}

export async function submitGuestProfile(
  eventId: string,
  guestId: string,
  input: ProfileInput,
  fetcher: typeof fetch = fetch,
): Promise<ProfileRead> {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(guestId).success) {
    throw new ApplicationError("VALIDATION_ERROR", "Choose a valid guest.");
  }
  const parsedInput = profileInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the profile.", Object.fromEntries(
      parsedInput.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]),
    ));
  }
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/guests/${guestId}/profile`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsedInput.data),
  }, "Could not reach the server. Your profile was not saved; try again.");
  if (response.status === 409) {
    const conflict = profileConflictSchema.safeParse(json);
    if (conflict.success) throw new StaleProfileError(conflict.data.data.profile, conflict.data.error.message);
  }
  if (!response.ok) throw toApplicationError(json, "The server could not save this profile. Try again.");
  const result = profileResultSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid result. Refresh to see the saved profile.");
  return result.data.data;
}
