import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchBlockInputSchema, matchBlockResultSchema, participationConflictSchema, participationInputSchema, participationResultSchema } from "@/modules/attendees/networking-schemas";
import { ParticipationConflictError, addMatchBlock, removeMatchBlock, updateGuestParticipation } from "@/modules/attendees/server/networking-service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";
import { readBoundedJson } from "./request-body";

const headers = { "Cache-Control": "private, no-store" };

type Dependencies = {
  getCurrentUser: typeof getCurrentUser;
  updateGuestParticipation: typeof updateGuestParticipation;
  addMatchBlock: typeof addMatchBlock;
  removeMatchBlock: typeof removeMatchBlock;
};
const defaults: Dependencies = { getCurrentUser, updateGuestParticipation, addMatchBlock, removeMatchBlock };

function validationFields(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries(error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
}

async function authenticate(request: Request, ids: Record<string, string>, dependencies: Dependencies) {
  const actor = await dependencies.getCurrentUser();
  if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
  for (const [name, value] of Object.entries(ids)) {
    if (!uuidSchema.safeParse(value).success) throw new ApplicationError("INVALID_JSON", `Enter a valid ${name} ID.`);
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
  return actor;
}

export async function handleUpdateGuestNetworking(
  request: Request, eventId: string, guestId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await authenticate(request, { event: eventId, guest: guestId }, dependencies);
    const input = await readBoundedJson(request, "networking change");
    const parsed = participationInputSchema.safeParse(input);
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the networking change.", validationFields(parsed.error));
    const result = await dependencies.updateGuestParticipation({ userId: actor.id, eventId, guestId, data: parsed.data });
    return Response.json(participationResultSchema.parse({ data: { participation: result.participation } }), { status: 200, headers });
  } catch (error) {
    if (error instanceof ParticipationConflictError) {
      const body = participationConflictSchema.parse({ error: { code: "CONFLICT", message: error.message }, data: { participation: error.latest } });
      return Response.json(body, { status: 409, headers });
    }
    return errorResponse(error, "update_guest_networking", "Something went wrong while saving this change. Please try again.");
  }
}

export async function handleAddMatchBlock(
  request: Request, eventId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await authenticate(request, { event: eventId }, dependencies);
    const input = await readBoundedJson(request, "do-not-match pair");
    const parsed = matchBlockInputSchema.safeParse(input);
    if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the guests.", validationFields(parsed.error));
    const result = await dependencies.addMatchBlock({ userId: actor.id, eventId, data: parsed.data });
    return Response.json(matchBlockResultSchema.parse({ data: { matchBlock: result.matchBlock } }), { status: result.created ? 201 : 200, headers });
  } catch (error) {
    return errorResponse(error, "add_match_block", "Something went wrong while saving this pair. Please try again.");
  }
}

export async function handleRemoveMatchBlock(
  request: Request, eventId: string, blockId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await authenticate(request, { event: eventId, block: blockId }, dependencies);
    await dependencies.removeMatchBlock({ userId: actor.id, eventId, blockId });
    return new Response(null, { status: 204, headers });
  } catch (error) {
    return errorResponse(error, "remove_match_block", "Something went wrong while removing this pair. Please try again.");
  }
}
