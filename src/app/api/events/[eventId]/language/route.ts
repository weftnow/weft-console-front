import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { eventLanguageResponseSchema } from "@/modules/events/settings-schemas";
import { updateEventLanguage } from "@/modules/events/server/language-service";
import { ApplicationError } from "@/shared/lib/application-error";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const { eventId } = await context.params;
    const result = await updateEventLanguage({ userId: actor.id, eventId, data: await readBoundedJson(request, "event language") });
    return Response.json(eventLanguageResponseSchema.parse({ data: result }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error, "update_event_language");
  }
}
