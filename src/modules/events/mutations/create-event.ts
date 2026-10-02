import { z } from "zod";
import { createEventResponseSchema, type EventDetailDto } from "../event-dto";
import type { CreateEventInput } from "../event-schemas";
import { ApplicationError } from "@/shared/lib/application-error";

const apiErrorSchema = z.object({ error: z.object({
  code: z.enum(["INVALID_JSON", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "VALIDATION_ERROR", "INTERNAL_ERROR"]),
  message: z.string(), fields: z.record(z.string(), z.string()).optional(),
}) });

export async function submitCreateEvent(
  input: CreateEventInput,
  fetcher: typeof fetch = fetch,
): Promise<EventDetailDto> {
  let response: Response;
  try {
    response = await fetcher("/api/events", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApplicationError("INTERNAL_ERROR", "Could not reach the server. Your form is still here; try again.");
  }
  let json: unknown;
  try { json = await response.json(); }
  catch { throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid response. Your form is still here; try again."); }
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    if (parsed.success) throw new ApplicationError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.fields);
    throw new ApplicationError("INTERNAL_ERROR", "The server could not create this event. Your form is still here; try again.");
  }
  const parsed = createEventResponseSchema.safeParse(json);
  if (!parsed.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid event. Your form is still here; try again.");
  return parsed.data.data.event;
}
