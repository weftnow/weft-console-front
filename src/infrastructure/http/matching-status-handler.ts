import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchingStatusResponseSchema } from "@/modules/network/matching-status-schemas";
import { getMatchingStatus } from "@/modules/network/server/matching-status-service";
import { ApplicationError } from "@/shared/lib/application-error";
import { engineModeHeaders } from "./engine-mode-headers";
import { errorResponse } from "./errors";

const headers = { "Cache-Control": "private, no-store" };

type Dependencies = { getCurrentUser: typeof getCurrentUser; getMatchingStatus: typeof getMatchingStatus };
const defaults: Dependencies = { getCurrentUser, getMatchingStatus };

export async function handleGetMatchingStatus(
  _request: Request, eventId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("INVALID_JSON", "Enter a valid event ID.");
    const result = await dependencies.getMatchingStatus({ userId: actor.id, eventId });
    return Response.json(matchingStatusResponseSchema.parse({ data: result }), { status: 200, headers: { ...headers, ...engineModeHeaders() } });
  } catch (error) {
    return errorResponse(error, "get_matching_status", "Something went wrong while loading the matching status. Please try again.");
  }
}
