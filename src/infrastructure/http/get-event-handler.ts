import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { eventDetailResponseSchema } from "@/modules/events/event-dto";
import { uuidSchema } from "@/modules/events/event-schemas";
import { getEvent, requireEventReaderAccess } from "@/modules/events/server/service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";

type Dependencies = {
  getCurrentUser: typeof getCurrentUser;
  getEvent: typeof getEvent;
  requireEventReaderAccess: typeof requireEventReaderAccess;
};

export async function handleGetEvent(
  eventId: string,
  dependencies: Dependencies = { getCurrentUser, getEvent, requireEventReaderAccess },
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "This event is unavailable.");
    const event = await dependencies.getEvent({ userId: actor.id, eventId });
    await dependencies.requireEventReaderAccess({ userId: actor.id, eventId, organizationId: event.organizationId });
    const body = eventDetailResponseSchema.parse({ data: { event } });
    return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "get_event", "Something went wrong while loading the event. Please try again.");
  }
}
