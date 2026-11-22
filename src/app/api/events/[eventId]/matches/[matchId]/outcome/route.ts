import { revalidatePath } from "next/cache";
import { requireOrganizerApiScope } from "@/infrastructure/auth/console-page-context";
import { engineModeHeaders } from "@/infrastructure/http/engine-mode-headers";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchCompletionInputSchema } from "@/modules/insights/match-completion-schema";
import { getMatchCompletion, setMatchCompletion } from "@/modules/insights/server/outcomes-service";
import { ApplicationError } from "@/shared/lib/application-error";

export const runtime = "nodejs";

type OutcomeRoute = RouteContext<"/api/events/[eventId]/matches/[matchId]/outcome">;

async function requireMatchScope(context: OutcomeRoute) {
  const scope = await requireOrganizerApiScope();
  const { eventId, matchId } = await context.params;
  if (!uuidSchema.safeParse(eventId).success || !uuidSchema.safeParse(matchId).success) {
    throw new ApplicationError("NOT_FOUND", "Match not found.");
  }
  return { ...scope, eventId, matchId };
}

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, context: OutcomeRoute) {
  try {
    const completion = await getMatchCompletion(await requireMatchScope(context));
    return Response.json({ data: { completion } }, { headers: { ...privateHeaders, ...engineModeHeaders() } });
  } catch (error) {
    return errorResponse(error, "read_match_outcome", "Could not load the introduction outcome.");
  }
}

export async function PUT(request: Request, context: OutcomeRoute) {
  try {
    const scope = await requireMatchScope(context);
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    }
    const input = matchCompletionInputSchema.safeParse(await readBoundedJson(request, "introduction outcome"));
    if (!input.success) throw new ApplicationError("VALIDATION_ERROR", "Choose a valid completion state and revision.");
    const completion = await setMatchCompletion({ ...scope, ...input.data });
    revalidatePath("/");
    revalidatePath("/outcomes");
    return Response.json({ data: { completion } }, { headers: privateHeaders });
  } catch (error) {
    return errorResponse(error, "write_match_outcome", "Could not save the introduction outcome.");
  }
}
