import "server-only";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchDetailResponseSchema, matchListQuerySchema, matchListResponseSchema } from "@/modules/network/matches-schemas";
import { getMatch, listMatches } from "@/modules/network/server/matches-service";
import { ApplicationError } from "@/shared/lib/application-error";
import { errorResponse } from "./errors";

const headers = { "Cache-Control": "private, no-store" };

type Dependencies = { getCurrentUser: typeof getCurrentUser; listMatches: typeof listMatches; getMatch: typeof getMatch };
const defaults: Dependencies = { getCurrentUser, listMatches, getMatch };

async function requireActor(dependencies: Dependencies) {
  const actor = await dependencies.getCurrentUser();
  if (!actor) throw new ApplicationError("UNAUTHORIZED", "Authentication is required.");
  return actor;
}

export async function handleListMatches(
  request: Request, eventId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await requireActor(dependencies);
    if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("INVALID_JSON", "Enter a valid event ID.");
    const query = matchListQuerySchema.safeParse({ status: new URL(request.url).searchParams.get("status") ?? undefined });
    if (!query.success) throw new ApplicationError("VALIDATION_ERROR", "Choose active or revoked matches.");
    const data = await dependencies.listMatches({ userId: actor.id, eventId, status: query.data.status });
    return Response.json(matchListResponseSchema.parse({ data }), { status: 200, headers });
  } catch (error) {
    return errorResponse(error, "list_matches", "Something went wrong while loading matches. Please try again.");
  }
}

export async function handleGetMatch(
  _request: Request, eventId: string, matchId: string, dependencies: Dependencies = defaults,
): Promise<Response> {
  try {
    const actor = await requireActor(dependencies);
    if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(matchId).success) {
      throw new ApplicationError("INVALID_JSON", "Enter a valid event and match ID.");
    }
    const match = await dependencies.getMatch({ userId: actor.id, eventId, matchId });
    return Response.json(matchDetailResponseSchema.parse({ data: { match } }), { status: 200, headers });
  } catch (error) {
    return errorResponse(error, "get_match", "Something went wrong while loading the match. Please try again.");
  }
}
