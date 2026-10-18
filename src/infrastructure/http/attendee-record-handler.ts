import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { findAttendeeCandidates, linkAttendees, replaceAttendee } from "@/modules/events/server/attendee-record-service";
import { attendeeCandidateResponseSchema } from "@/modules/events/attendee-record-schemas";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";
import { readBoundedJson } from "./request-body";

export async function handleReplaceAttendee(request: Request, eventId: string, guestId: string) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const attendee = await replaceAttendee({ userId: actor.id, eventId, guestId, data: await readBoundedJson(request, "attendee details") });
    return Response.json({ data: { attendee } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "replace_attendee", "Something went wrong while saving attendee details. Please try again."); }
}

export async function handleAttendeeCandidates(eventId: string, guestId: string) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    const candidates = await findAttendeeCandidates({ userId: actor.id, eventId, guestId });
    return Response.json(attendeeCandidateResponseSchema.parse({ data: { candidates } }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "attendee_candidates", "Could not load possible duplicate records. Please try again."); }
}

export async function handleLinkAttendees(request: Request, eventId: string) {
  try {
    const actor = await getCurrentUser();
    if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    const result = await linkAttendees({ userId: actor.id, eventId, data: await readBoundedJson(request, "attendee identity link") });
    return Response.json({ data: result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error, "link_attendees", "Something went wrong while linking attendee records. Please try again."); }
}
