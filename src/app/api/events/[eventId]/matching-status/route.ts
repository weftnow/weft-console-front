import { handleGetMatchingStatus } from "@/infrastructure/http/matching-status-handler";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/events/[eventId]/matching-status">) {
  const { eventId } = await context.params;
  return handleGetMatchingStatus(request, eventId);
}
