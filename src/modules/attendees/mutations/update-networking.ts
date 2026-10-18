import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import { participationConflictSchema, participationInputSchema, participationResultSchema } from "../networking-schemas";
import type { ParticipationDto, ParticipationInput } from "../networking-schemas";
import { sendJson, toApplicationError } from "./api-error";

/** Stale save: the server has a newer version of this guest, returned here. */
export class StaleParticipationError extends ApplicationError {
  constructor(public readonly latest: ParticipationDto, message: string) {
    super("CONFLICT", message);
    this.name = "StaleParticipationError";
  }
}

export async function submitGuestNetworking(
  eventId: string,
  guestId: string,
  input: ParticipationInput,
  fetcher: typeof fetch = fetch,
): Promise<ParticipationDto> {
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(guestId).success) {
    throw new ApplicationError("VALIDATION_ERROR", "Choose a valid guest.");
  }
  const parsedInput = participationInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the networking change.", Object.fromEntries(
      parsedInput.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]),
    ));
  }
  const { response, json } = await sendJson(fetcher, `/api/events/${eventId}/guests/${guestId}/networking`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsedInput.data),
  }, "Could not reach the server. Your change was not saved; try again.");
  if (response.status === 409) {
    const conflict = participationConflictSchema.safeParse(json);
    if (conflict.success) throw new StaleParticipationError(conflict.data.data.participation, conflict.data.error.message);
  }
  if (!response.ok) throw toApplicationError(json, "The server could not save this change. Try again.");
  const result = participationResultSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid result. Refresh to see the saved state.");
  return result.data.data.participation;
}
