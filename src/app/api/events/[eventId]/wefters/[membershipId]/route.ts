import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { ApplicationError } from "@/shared/lib/application-error";
import { updateWefter } from "@/modules/events/server/settings-service";
import { uuidSchema } from "@/modules/events/event-schemas";
export const runtime = "nodejs";
export async function PUT(request: Request, context: { params: Promise<{ eventId: string; membershipId: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required."); if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site."); const { eventId, membershipId } = await context.params; if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(membershipId).success) throw new ApplicationError("NOT_FOUND", "Wefter not found."); const value = await updateWefter(eventId, membershipId, actor.id, await readBoundedJson(request, "Wefter schedule")); return Response.json({ data: { wefter: value } }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error, "update_event_wefter"); }
}
