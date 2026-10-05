import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { requireOrganizationContext } from "@/infrastructure/auth/console-page-context";
import { eventDetailResponseSchema } from "@/modules/events/event-dto";
import { uuidSchema } from "@/modules/events/event-schemas";
import { getEvent } from "@/modules/events/queries/get-event";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";

type Dependencies = {
  getCurrentUser: typeof getCurrentUser;
  getEvent: typeof getEvent;
  requireOrganizationContext: typeof requireOrganizationContext;
};

export async function handleGetEvent(
  eventId: string,
  dependencies: Dependencies = { getCurrentUser, getEvent, requireOrganizationContext },
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "This event is unavailable.");
    const event = await dependencies.getEvent({ userId: actor.id, eventId });
    await dependencies.requireOrganizationContext({ user: actor, organizationId: event.organizationId, allowedRoles: ["owner", "organizer"] });
    const body = eventDetailResponseSchema.parse({ data: { event } });
    return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "get_event", "Something went wrong while loading the event. Please try again.");
  }
}
