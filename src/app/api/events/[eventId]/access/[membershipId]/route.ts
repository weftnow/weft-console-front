import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { updateEventAccess } from "@/modules/events/server/access-service";
import { uuidSchema } from "@/modules/events/event-schemas";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ eventId: string; membershipId: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const { eventId, membershipId } = await context.params;
    if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(membershipId).success) throw new ApplicationError("NOT_FOUND", "Event access not found.");
    const value = await updateEventAccess({ eventId, membershipId, userId: actor.id, data: await readBoundedJson(request) });
    return Response.json({ data: { eventAccess: value } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "update_event_access"); }
}
