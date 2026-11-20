import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOrganizerApiScope } from "@/infrastructure/auth/console-page-context";
import { errorResponse } from "@/infrastructure/http/errors";
import { readBoundedJson } from "@/infrastructure/http/request-body";
import { uuidSchema } from "@/modules/events/event-schemas";
import { getReportingEvidence, saveReportingEvidence } from "@/modules/insights/server/reporting-evidence";
import { ApplicationError } from "@/shared/lib/application-error";

export const runtime = "nodejs";

type EvidenceRoute = RouteContext<"/api/events/[eventId]/reporting-evidence">;

const headers = { "Cache-Control": "private, no-store" };
const replacementSchema = z.object({ expectedRevision: z.number().int().nonnegative(), evidence: z.record(z.string(), z.unknown()) }).strict();

async function requireEventScope(context: EvidenceRoute) {
  const scope = await requireOrganizerApiScope();
  const { eventId } = await context.params;
  const event = uuidSchema.safeParse(eventId);
  if (!event.success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  return { ...scope, eventId: event.data.toLowerCase() };
}

export async function GET(_request: Request, context: EvidenceRoute) {
  try {
    const document = await getReportingEvidence(await requireEventScope(context));
    return Response.json({ data: document }, { headers });
  } catch (error) {
    return errorResponse(error, "read_reporting_evidence", "Could not load reporting evidence.");
  }
}

export async function PUT(request: Request, context: EvidenceRoute) {
  try {
    const scope = await requireEventScope(context);
    if (request.headers.get("origin") !== new URL(request.url).origin) {
      throw new ApplicationError("FORBIDDEN", "This request is not from this site.");
    }
    const input = replacementSchema.safeParse(await readBoundedJson(request, "reporting evidence"));
    if (!input.success) throw new ApplicationError("VALIDATION_ERROR", "Provide an evidence document and the loaded revision.");
    const document = await saveReportingEvidence({ ...scope, ...input.data });
    revalidatePath("/outcomes/reports");
    revalidatePath("/outcomes/reports/evidence");
    return Response.json({ data: document }, { headers });
  } catch (error) {
    return errorResponse(error, "save_reporting_evidence", "Could not save reporting evidence.");
  }
}
