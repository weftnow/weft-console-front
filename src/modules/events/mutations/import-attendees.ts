import { z } from "zod";
import { attendeeImportInputSchema, importAttendeesResultSchema } from "../attendee-import-schemas";
import type { AttendeeImportInput, ImportAttendeesResult } from "../attendee-import-schemas";
import { uuidSchema } from "../event-schemas";
import { ApplicationError } from "@/shared/lib/application-error";

const apiErrorSchema = z.object({ error: z.object({
  code: z.enum(["INVALID_JSON", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "VALIDATION_ERROR", "INTERNAL_ERROR"]),
  message: z.string(), fields: z.record(z.string(), z.string()).optional(),
}) });

export async function submitAttendeeImport(
  eventId: string,
  input: AttendeeImportInput,
  fetcher: typeof fetch = fetch,
): Promise<ImportAttendeesResult> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid event.");
  const parsedInput = attendeeImportInputSchema.safeParse(input);
  if (!parsedInput.success) {
    const fields = Object.fromEntries(parsedInput.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
    throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", fields);
  }
  let response: Response;
  try {
    response = await fetcher(`/api/events/${eventId}/attendee-imports`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsedInput.data),
    });
  } catch {
    throw new ApplicationError("INTERNAL_ERROR", "Could not reach the server. Your CSV is still selected; try again.");
  }
  let json: unknown;
  try { json = await response.json(); }
  catch { throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid response. Your CSV is still selected; try again."); }
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json);
    if (parsedError.success) throw new ApplicationError(parsedError.data.error.code, parsedError.data.error.message, parsedError.data.error.fields);
    throw new ApplicationError("INTERNAL_ERROR", "The server could not import this CSV. Your file is still selected; try again.");
  }
  const parsedResult = importAttendeesResultSchema.safeParse(json);
  if (!parsedResult.success) throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid import result. Your CSV is still selected; try again.");
  return parsedResult.data.data;
}

/** Runs a submit action once while its first promise is pending. */
export async function submitImportOnce(guard: { current: boolean }, operation: () => Promise<unknown>): Promise<boolean> {
  if (guard.current) return false;
  guard.current = true;
  try { await operation(); return true; }
  finally { guard.current = false; }
}

export async function refreshAfterImport(onSaved: () => void | Promise<void>): Promise<string | null> {
  try { await onSaved(); return null; }
  catch { return "Import saved; refresh to load the updated roster."; }
}

export function importSuccessMessage(result: ImportAttendeesResult, hasActiveFilters: boolean): string {
  if (result.replayed) return "This file was already imported; no attendees were added again.";
  const added = result.import.storedCount;
  const skipped = result.import.duplicateCount;
  const base = `Import saved: ${added.toLocaleString()} added, ${skipped.toLocaleString()} already on this event and skipped.`;
  return hasActiveFilters && added > 0 ? `${base} Some new attendees may be hidden by the current search or filters.` : base;
}
