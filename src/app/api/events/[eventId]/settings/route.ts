import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { ApplicationError } from "@/shared/lib/application-error";
import { readSettings, updateSettings } from "@/modules/events/server/settings-service";
import { uuidSchema } from "@/modules/events/event-schemas";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required."); const { eventId } = await context.params; if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found."); return Response.json({ data: { settings: await readSettings(eventId, actor.id) } }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error, "read_event_settings"); }
}
export async function PUT(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required."); if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site."); const { eventId } = await context.params; if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found."); const value = await updateSettings(eventId, actor.id, await readBoundedJson(request, "event settings")); return Response.json({ data: { settings: value } }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return errorResponse(error, "update_event_settings"); }
}
