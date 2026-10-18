import { handleUpdateGuestNetworking } from "@/infrastructure/http/networking-handlers";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: RouteContext<"/api/events/[eventId]/guests/[guestId]/networking">) {
  const { eventId, guestId } = await context.params;
  return handleUpdateGuestNetworking(request, eventId, guestId);
}
