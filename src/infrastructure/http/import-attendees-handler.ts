import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { attendeeImportInputSchema, importAttendeesResultSchema } from "@/modules/events/attendee-import-schemas";
import { uuidSchema } from "@/modules/events/event-schemas";
import { importAttendees } from "@/modules/events/server/attendee-import-service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";
import { readBoundedJson } from "./request-body";

type Dependencies = { getCurrentUser: typeof getCurrentUser; importAttendees: typeof importAttendees };

export async function handleImportAttendees(
  request: Request,
  eventId: string,
  dependencies: Dependencies = { getCurrentUser, importAttendees },
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("INVALID_JSON", "Enter a valid event ID.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const input = await readBoundedJson(request, "attendee import");
    const parsed = attendeeImportInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
      throw new ApplicationError("VALIDATION_ERROR", "Check the attendee CSV.", fields);
    }
    const result = await dependencies.importAttendees({ userId: actor.id, eventId, data: parsed.data });
    const body = importAttendeesResultSchema.parse({ data: result });
    return Response.json(body, { status: result.replayed ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "import_attendees", "Something went wrong while importing attendees. Please try again.");
  }
}
