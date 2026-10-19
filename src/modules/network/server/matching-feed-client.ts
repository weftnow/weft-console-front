import "server-only";
import { uuidSchema } from "@/modules/events/event-schemas";
import { engineMatchingFeedSchema, type MatchingFeedResult } from "../matching-feed-schemas";
import { engineBaseUrl, type Environment } from "./matching-engine-client";

/** 200 entries carry evidence quotes, so the cap is larger than the status client's. */
const MAX_RESPONSE_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
export const FEED_PAGE_LIMIT = 200;

type Options = { fetcher?: typeof fetch; env?: Environment; timeoutMs?: number };

/**
 * Reads one page of an event's matching feed with the server-held service credential.
 * Every failure becomes a typed `unavailable` result; no credential, URL or engine detail is returned.
 */
export async function readEngineMatchingFeed(
  { organizationId, eventId, after, limit = FEED_PAGE_LIMIT }: { organizationId: string; eventId: string; after: number; limit?: number },
  { fetcher = fetch, env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS }: Options = {},
): Promise<MatchingFeedResult> {
  const base = engineBaseUrl(env.WEFT_ENGINE_URL);
  const token = env.WEFT_ENGINE_SERVICE_TOKEN;
  if (!base || !token) return { availability: "unavailable", reason: "not_configured" };
  if (
    !uuidSchema.safeParse(organizationId).success || !uuidSchema.safeParse(eventId).success
    || !Number.isInteger(after) || after < 0 || !Number.isInteger(limit) || limit < 1 || limit > FEED_PAGE_LIMIT
  ) return { availability: "unavailable", reason: "invalid_response" };
  const url = new URL(base);
  url.pathname = `${base.pathname.replace(/\/+$/, "")}/v1/organizations/${organizationId}/events/${eventId}/matching/feed`;
  url.searchParams.set("after", String(after));
  url.searchParams.set("limit", String(limit));
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json", "X-Weft-Service-Token": token },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.warn("weft_matching_feed_unavailable", { status: response.status });
      return { availability: "unavailable", reason: "unreachable" };
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) return { availability: "unavailable", reason: "invalid_response" };
    const parsed = engineMatchingFeedSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.warn("weft_matching_feed_invalid_response");
      return { availability: "unavailable", reason: "invalid_response" };
    }
    return { availability: "available", feed: parsed.data };
  } catch (error) {
    // Log the failure class only: messages can contain the engine address.
    console.warn("weft_matching_feed_unavailable", { error: error instanceof Error ? error.name : "unknown" });
    return { availability: "unavailable", reason: error instanceof SyntaxError ? "invalid_response" : "unreachable" };
  }
}
