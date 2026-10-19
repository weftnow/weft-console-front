import { handleGetMatch } from "@/infrastructure/http/matches-handler";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/events/[eventId]/matches/[matchId]">) {
  const { eventId, matchId } = await context.params;
  return handleGetMatch(request, eventId, matchId);
}
