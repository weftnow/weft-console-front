import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { getEventCover } from "@/modules/events/queries/get-event";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";

type Dependencies = { getCurrentUser: typeof getCurrentUser; getEventCover: typeof getEventCover };

export async function handleGetEventCover(
  eventId: string,
  dependencies: Dependencies = { getCurrentUser, getEventCover },
): Promise<Response> {
  try {
    const actor = await dependencies.getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    const cover = await dependencies.getEventCover({ userId: actor.id, eventId });
    return new Response(new Uint8Array(cover.bytes), { status: 200, headers: {
      "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    return errorResponse(error, "get_event_cover");
  }
}
