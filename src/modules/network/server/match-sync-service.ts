import "server-only";
import type { MatchingFeedResult } from "../matching-feed-schemas";
import type { MatchSyncNote } from "../matches-schemas";
import { FEED_PAGE_LIMIT, readEngineMatchingFeed } from "./matching-feed-client";
import * as repository from "./match-repository";

/** Ten full pages per call; a longer backlog continues on the next read. */
export const MAX_SYNC_PAGES = 10;

type Dependencies = {
  readCursor: typeof repository.readCursor;
  readFeed: (input: { organizationId: string; eventId: string; after: number }) => Promise<MatchingFeedResult>;
  applyPage: typeof repository.applyFeedPage;
  markCheckedThrough: typeof repository.markCheckedThrough;
};
const defaults: Dependencies = {
  readCursor: repository.readCursor,
  readFeed: readEngineMatchingFeed,
  applyPage: repository.applyFeedPage,
  markCheckedThrough: repository.markCheckedThrough,
};

/**
 * Pulls the engine feed into the event's matches. Callers authorize first. The feed is fetched outside the database
 * transaction; the page is applied only if the cursor is still where it was read, so concurrent syncs are safe.
 * Pass `finishedRunId` to record that the Console has caught up with that run.
 */
export async function syncEventMatches(
  { organizationId, eventId, finishedRunId }: { organizationId: string; eventId: string; finishedRunId?: string | null },
  dependencies: Dependencies = defaults,
): Promise<MatchSyncNote> {
  for (let page = 0; page < MAX_SYNC_PAGES; page += 1) {
    const cursor = await dependencies.readCursor(eventId);
    const result = await dependencies.readFeed({ organizationId, eventId, after: cursor.lastSeq });
    if (result.availability === "unavailable") return { state: "unavailable", reason: result.reason };
    const { feed } = result;
    if (feed.entries.length > 0) {
      try {
        await dependencies.applyPage(eventId, cursor.lastSeq, feed);
      } catch (error) {
        if (error instanceof repository.InvalidFeedError) return { state: "unavailable", reason: "invalid_response" };
        throw error;
      }
    }
    if (feed.entries.length < FEED_PAGE_LIMIT) {
      if (finishedRunId) await dependencies.markCheckedThrough(eventId, finishedRunId);
      return { state: "synced" };
    }
  }
  return { state: "synced" };
}

/** Status-poll trigger: sync once for each newly finished run. Failures never affect the status response. */
export async function syncAfterFinishedRun(
  { organizationId, eventId, runId }: { organizationId: string; eventId: string; runId: string },
  dependencies: Dependencies = defaults,
): Promise<void> {
  try {
    const cursor = await dependencies.readCursor(eventId);
    if (cursor.checkedThroughRunId === runId) return;
    await syncEventMatches({ organizationId, eventId, finishedRunId: runId }, dependencies);
  } catch {
    console.warn("weft_match_sync_after_run_failed");
  }
}
