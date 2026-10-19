import { handleAddMatchBlock } from "@/infrastructure/http/networking-handlers";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/events/[eventId]/match-blocks">) {
  const { eventId } = await context.params;
  return handleAddMatchBlock(request, eventId);
}
