import { handleGetGuestProfile, handleSaveGuestProfile } from "@/infrastructure/http/profile-handlers";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/events/[eventId]/guests/[guestId]/profile">) {
  const { eventId, guestId } = await context.params;
  return handleGetGuestProfile(request, eventId, guestId);
}

export async function PUT(request: Request, context: RouteContext<"/api/events/[eventId]/guests/[guestId]/profile">) {
  const { eventId, guestId } = await context.params;
  return handleSaveGuestProfile(request, eventId, guestId);
}
