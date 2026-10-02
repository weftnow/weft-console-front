import { handleGetEventCover } from "@/infrastructure/http/get-event-cover-handler";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }): Promise<Response> {
  const { eventId } = await context.params;
  return handleGetEventCover(eventId);
}
