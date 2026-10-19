import "server-only";
import { uuidSchema } from "@/modules/events/event-schemas";
import { engineMatchingStatusSchema, type MatchingStatusResult } from "../matching-status-schemas";

const MAX_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;

type Environment = Record<string, string | undefined>;
type Options = { fetcher?: typeof fetch; env?: Environment; timeoutMs?: number };

function engineBaseUrl(value: string | undefined): URL | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return null;
  return url;
}

/**
 * Reads one event's matching status from the engine with the server-held service credential.
 * Every failure becomes a typed `unavailable` result; no credential, URL or engine detail is returned.
 */
export async function readEngineMatchingStatus(
  { organizationId, eventId }: { organizationId: string; eventId: string },
  { fetcher = fetch, env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS }: Options = {},
): Promise<MatchingStatusResult> {
  const base = engineBaseUrl(env.WEFT_ENGINE_URL);
  const token = env.WEFT_ENGINE_SERVICE_TOKEN;
  if (!base || !token) return { availability: "unavailable", reason: "not_configured" };
  if (!uuidSchema.safeParse(organizationId).success || !uuidSchema.safeParse(eventId).success) {
    return { availability: "unavailable", reason: "invalid_response" };
  }
  const url = new URL(base);
  url.pathname = `${base.pathname.replace(/\/+$/, "")}/v1/organizations/${organizationId}/events/${eventId}/matching/status`;
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", "X-Weft-Service-Token": token },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.warn("weft_matching_engine_unavailable", { status: response.status });
      return { availability: "unavailable", reason: "unreachable" };
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) return { availability: "unavailable", reason: "invalid_response" };
    const parsed = engineMatchingStatusSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.warn("weft_matching_engine_invalid_response");
      return { availability: "unavailable", reason: "invalid_response" };
    }
    return { availability: "available", status: parsed.data };
  } catch (error) {
    // Log the failure class only: messages can contain the engine address.
    console.warn("weft_matching_engine_unavailable", { error: error instanceof Error ? error.name : "unknown" });
    return { availability: "unavailable", reason: error instanceof SyntaxError ? "invalid_response" : "unreachable" };
  }
}
