import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { uuidSchema } from "@/modules/events/event-schemas";
import { profileConflictSchema, profileInputSchema, profileResultSchema } from "@/modules/attendees/profile-schemas";
import { validationFields } from "@/modules/attendees/server/networking-service";
import { ProfileConflictError, getGuestProfile, saveGuestProfile } from "@/modules/attendees/server/profile-service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";
import { readBoundedJson } from "./request-body";

const headers = { "Cache-Control": "private, no-store" };

type Dependencies = {
  getCurrentUser: typeof getCurrentUser;
  getGuestProfile: typeof getGuestProfile;
  saveGuestProfile: typeof saveGuestProfile;
};
const defaults: Dependencies = { getCurrentUser, getGuestProfile, saveGuestProfile };

async function authenticate(request: Request, ids: Record<string, string>, dependencies: Dependencies, checkOrigin: boolean) {
  const actor = await dependencies.getCurrentUser();
  if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
  for (const [name, value] of Object.entries(ids)) {
    if (!uuidSchema.safeParse(value).success) throw new ApplicationError("INVALID_JSON", `Enter a valid ${name} ID.`);
  }
  if (checkOrigin && request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
  return actor;
}

export async function handleGetGuestProfile(
  request: Request, eventId: string, guestId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await authenticate(request, { event: eventId, guest: guestId }, dependencies, false);
    const read = await dependencies.getGuestProfile({ userId: actor.id, eventId, guestId });
    return Response.json(profileResultSchema.parse({ data: read }), { status: 200, headers });
  } catch (error) {
    return errorResponse(error, "get_guest_profile", "Something went wrong while loading this profile. Please try again.");
  }
}

export async function handleSaveGuestProfile(
  request: Request, eventId: string, guestId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await authenticate(request, { event: eventId, guest: guestId }, dependencies, true);
    const input = await readBoundedJson(request, "profile");
    const parsed = profileInputSchema.safeParse(input);
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the profile.", validationFields(parsed.error));
    const result = await dependencies.saveGuestProfile({ userId: actor.id, eventId, guestId, data: parsed.data });
    return Response.json(profileResultSchema.parse({ data: result.read }), { status: 200, headers });
  } catch (error) {
    if (error instanceof ProfileConflictError) {
      const body = profileConflictSchema.parse({ error: { code: "CONFLICT", message: error.message }, data: { profile: error.latest } });
      return Response.json(body, { status: 409, headers });
    }
    return errorResponse(error, "save_guest_profile", "Something went wrong while saving this profile. Please try again.");
  }
}
