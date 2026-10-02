import "server-only";
import { ApplicationError, type ApplicationErrorCode } from "@/shared/lib/application-error";

const statuses: Record<ApplicationErrorCode, number> = {
  INVALID_JSON: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413, UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION_ERROR: 422, INTERNAL_ERROR: 500,
};

export function errorResponse(error: unknown, operation: string, unexpectedMessage?: string): Response {
  const requestId = crypto.randomUUID();
  const safe = error instanceof ApplicationError ? error : new ApplicationError(
    "INTERNAL_ERROR", unexpectedMessage ?? "Something went wrong while creating the event. Please try again.",
  );
  if (!(error instanceof ApplicationError)) {
    // Deliberately omit the thrown object's message, SQL detail, stack and parameters.
    console.error("weft_request_failure", { requestId, operation });
  }
  return Response.json({ error: { code: safe.code, message: safe.message, ...(safe.fields ? { fields: safe.fields } : {}) } }, {
    status: statuses[safe.code],
    headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId },
  });
}
