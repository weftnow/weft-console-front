import { handleListMatches } from "@/infrastructure/http/matches-handler";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/events/[eventId]/matches">) {
  const { eventId } = await context.params;
  return handleListMatches(request, eventId);
}
