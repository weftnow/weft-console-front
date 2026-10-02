import { handleImportAttendees } from "@/infrastructure/http/import-attendees-handler";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/events/[eventId]/attendee-imports">) {
  const { eventId } = await context.params;
  return handleImportAttendees(request, eventId);
}
