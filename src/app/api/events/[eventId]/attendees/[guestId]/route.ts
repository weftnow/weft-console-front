import { handleAttendeeCandidates, handleReplaceAttendee } from "@/infrastructure/http/attendee-record-handler";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ eventId: string; guestId: string }> }) {
  const { eventId, guestId } = await context.params;
  return handleReplaceAttendee(request, eventId, guestId);
}

export async function GET(_request: Request, context: { params: Promise<{ eventId: string; guestId: string }> }) {
  const { eventId, guestId } = await context.params;
  return handleAttendeeCandidates(eventId, guestId);
}
