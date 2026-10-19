import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "@/infrastructure/http/errors";
import { getEventAccess } from "@/modules/events/server/access-service";
import { uuidSchema } from "@/modules/events/event-schemas";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    const { eventId } = await context.params;
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
    return Response.json({ data: { eventAccess: await getEventAccess({ eventId, userId: actor.id }) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "list_event_access"); }
}
