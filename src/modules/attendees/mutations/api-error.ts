import { z } from "zod";
import { ApplicationError } from "@/shared/lib/application-error";

export const apiErrorSchema = z.object({ error: z.object({
  code: z.enum(["INVALID_JSON", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "VALIDATION_ERROR", "CONFLICT", "INTERNAL_ERROR"]),
  message: z.string(), fields: z.record(z.string(), z.string()).optional(),
}) });

export async function sendJson(fetcher: typeof fetch, url: string, init: RequestInit, unreachable: string): Promise<{ response: Response; json: unknown }> {
  let response: Response;
  try {
    response = await fetcher(url, { ...init, credentials: "same-origin" });
  } catch {
    throw new ApplicationError("INTERNAL_ERROR", unreachable);
  }
  let json: unknown = null;
  if (response.status !== 204) {
    try { json = await response.json(); }
    catch { throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid response. Try again."); }
  }
  return { response, json };
}

export function toApplicationError(json: unknown, fallback: string): ApplicationError {
  const parsed = apiErrorSchema.safeParse(json);
  return parsed.success
    ? new ApplicationError(parsed.data.error.code, parsed.data.error.message, parsed.data.error.fields)
    : new ApplicationError("INTERNAL_ERROR", fallback);
}
