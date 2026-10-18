import { handleLinkAttendees } from "@/infrastructure/http/attendee-record-handler";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await context.params;
  return handleLinkAttendees(request, eventId);
}
