import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { createEventResponseSchema } from "@/modules/events/event-dto";
import { createEvent } from "@/modules/events/server/service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";
import { readBoundedJson } from "./request-body";

type Dependencies = { getCurrentUser: typeof getCurrentUser; createEvent: typeof createEvent };

export async function handleCreateEvent(
  request: Request,
  dependencies: Dependencies = { getCurrentUser, createEvent },
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const data = await readBoundedJson(request);
    const organizationId = typeof data === "object" && data !== null && "organizationId" in data ? String(data.organizationId) : "";
    const event = await dependencies.createEvent({ userId: actor.id, organizationId, data });
    const body = createEventResponseSchema.parse({ data: { event } });
    return Response.json(body, { status: 201, headers: {
      Location: `/events/${event.id}`, "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    return errorResponse(error, "create_event");
  }
}
