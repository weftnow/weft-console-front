import { handleGetEvent } from "@/infrastructure/http/get-event-handler";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  return handleGetEvent(eventId);
}
