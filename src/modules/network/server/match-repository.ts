import "server-only";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventGuests, eventMatchBlocks, eventMatchFeedCursors, eventMatches, events } from "@/infrastructure/database/schema/events";
import type { MatchRevocationReason, MatchingFeed, MatchingFeedEntry } from "../matching-feed-schemas";
import { introductionPathFor, pinnedVersionsAreKnown, revocationReasonForIssued, type EligibilityGuest } from "../match-rules";

export type FeedCursor = { lastSeq: number; checkedThroughRunId: string | null };
export type ApplyResult = { applied: false } | { applied: true; created: number; revoked: number; skipped: number };

/** The feed named a pinned profile version the Console never wrote, so the page cannot be trusted. */
export class InvalidFeedError extends Error {}

export async function readCursor(eventId: string): Promise<FeedCursor> {
  const [row] = await getDatabase().select({ lastSeq: eventMatchFeedCursors.lastSeq, checkedThroughRunId: eventMatchFeedCursors.checkedThroughRunId })
    .from(eventMatchFeedCursors).where(eq(eventMatchFeedCursors.eventId, eventId)).limit(1);
  return row ?? { lastSeq: 0, checkedThroughRunId: null };
}

export async function markCheckedThrough(eventId: string, runId: string): Promise<void> {
  await getDatabase().insert(eventMatchFeedCursors).values({ eventId, checkedThroughRunId: runId })
    .onConflictDoUpdate({ target: eventMatchFeedCursors.eventId, set: { checkedThroughRunId: runId, updatedAt: new Date() } });
}

function pairGuestIds(entries: readonly MatchingFeedEntry[]): string[] {
  return [...new Set(entries.flatMap(({ recommendation }) => [recommendation.guestLowId, recommendation.guestHighId]))];
}

/**
 * Applies one feed page in a single transaction. The event row is locked and the cursor re-read first: if another
 * request already moved it, nothing is applied and the caller re-reads. Inserts conflict-skip and revocation only updates
 * active rows, so a replayed page changes nothing and never reactivates a revoked match.
 */
export async function applyFeedPage(eventId: string, after: number, feed: MatchingFeed): Promise<ApplyResult> {
  return getDatabase().transaction(async (tx) => {
    await tx.select({ id: events.id }).from(events).where(eq(events.id, eventId)).for("update").limit(1);
    await tx.insert(eventMatchFeedCursors).values({ eventId }).onConflictDoNothing();
    const [cursor] = await tx.select().from(eventMatchFeedCursors).where(eq(eventMatchFeedCursors.eventId, eventId)).for("update").limit(1);
    if (!cursor || cursor.lastSeq !== after) return { applied: false } as const;

    const guestRows = feed.entries.length === 0 ? [] : await tx.select({
      id: eventGuests.id, personId: eventGuests.personId, guestType: eventGuests.guestType,
      networkingStatus: eventGuests.networkingStatus, profileVersion: eventGuests.profileVersion,
    }).from(eventGuests).where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, pairGuestIds(feed.entries))));
    const guests = new Map<string, EligibilityGuest>(guestRows.map((row) => [row.id, row]));
    const blockRows = guests.size === 0 ? [] : await tx.select({ low: eventMatchBlocks.guestLowId, high: eventMatchBlocks.guestHighId })
      .from(eventMatchBlocks).where(and(eq(eventMatchBlocks.eventId, eventId), inArray(eventMatchBlocks.guestLowId, [...guests.keys()])));
    const blocks = blockRows.map((row) => ({ guestIds: [row.low, row.high] as [string, string] }));

    let created = 0; let revoked = 0; let skipped = 0;
    for (const entry of feed.entries) {
      const item = entry.recommendation;
      const low = guests.get(item.guestLowId);
      const high = guests.get(item.guestHighId);
      if (!low || !high) { skipped += 1; continue; }
      const pinned = { low: item.profileVersions[item.guestLowId], high: item.profileVersions[item.guestHighId] };
      if (!pinnedVersionsAreKnown(low, high, pinned)) throw new InvalidFeedError("Pinned profile version is newer than the guest's profile.");

      const localReason = entry.kind === "issued" ? revocationReasonForIssued(low, high, blocks) : null;
      const reason: MatchRevocationReason | null = entry.kind === "revoked" ? item.revocationReason : localReason;
      const revokedAt = entry.kind === "revoked" && item.revokedAt ? new Date(item.revokedAt) : new Date();

      if (entry.kind === "revoked") {
        const updated = await tx.update(eventMatches).set({ status: "revoked", revokedAt, revocationReason: reason, updatedAt: new Date() })
          .where(and(eq(eventMatches.eventId, eventId), eq(eventMatches.engineRecommendationId, item.recommendationId), eq(eventMatches.status, "active")))
          .returning({ id: eventMatches.id });
        if (updated.length > 0) { revoked += 1; continue; }
      }
      const inserted = await tx.insert(eventMatches).values({
        eventId, guestLowId: low.id, guestHighId: high.id, engineRecommendationId: item.recommendationId, sourceRunId: entry.runId,
        profileVersionLow: pinned.low, profileVersionHigh: pinned.high,
        scoreLow: item.directionalScores[low.id], scoreHigh: item.directionalScores[high.id], pairScore: item.pairScore,
        benefits: item.benefits, shareableReasons: item.shareableReasons, missingInformation: item.missingInformation,
        evidence: item.evidence, uncertainty: item.uncertainty,
        introductionPath: introductionPathFor(low.guestType, high.guestType),
        status: reason ? "revoked" : "active", revokedAt: reason ? revokedAt : null, revocationReason: reason,
      }).onConflictDoNothing().returning({ id: eventMatches.id });
      if (inserted.length > 0) { created += 1; if (reason) revoked += 1; }
    }

    await tx.update(eventMatchFeedCursors).set({ lastSeq: Math.max(feed.nextCursor, after), updatedAt: new Date() })
      .where(eq(eventMatchFeedCursors.eventId, eventId));
    return { applied: true, created, revoked, skipped } as const;
  });
}

type MatchRow = typeof eventMatches.$inferSelect;
export type GuestRow = Pick<typeof eventGuests.$inferSelect, "id" | "firstName" | "lastName" | "company" | "jobPosition" | "guestType" | "networkingStatus" | "profileVersion" | "personId">;

const guestColumns = {
  id: eventGuests.id, firstName: eventGuests.firstName, lastName: eventGuests.lastName, company: eventGuests.company,
  jobPosition: eventGuests.jobPosition, guestType: eventGuests.guestType, networkingStatus: eventGuests.networkingStatus,
  profileVersion: eventGuests.profileVersion, personId: eventGuests.personId,
};

const MAX_LIST = 1000;

export async function listEventMatches(eventId: string, status?: "active" | "revoked"): Promise<{
  rows: MatchRow[]; guests: Map<string, GuestRow>; counts: { active: number; revoked: number };
}> {
  const database = getDatabase();
  const all = await database.select({ status: eventMatches.status, count: sql<number>`count(*)::int` })
    .from(eventMatches).where(eq(eventMatches.eventId, eventId)).groupBy(eventMatches.status);
  const counts = { active: 0, revoked: 0 };
  for (const row of all) counts[row.status] = row.count;
  const rows = await database.select().from(eventMatches)
    .where(status ? and(eq(eventMatches.eventId, eventId), eq(eventMatches.status, status)) : eq(eventMatches.eventId, eventId))
    .orderBy(desc(eventMatches.createdAt), desc(eventMatches.id)).limit(MAX_LIST);
  const ids = [...new Set(rows.flatMap((row) => [row.guestLowId, row.guestHighId]))];
  const guestRows = ids.length === 0 ? [] : await database.select(guestColumns).from(eventGuests)
    .where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, ids)));
  return { rows, guests: new Map(guestRows.map((row) => [row.id, row])), counts };
}

export async function findEventMatch(eventId: string, matchId: string): Promise<{
  match: MatchRow; guests: Map<string, GuestRow>;
  restrictions: { guestId: string; otherGuestId: string; reason: string | null }[];
  /** Other matches for either guest or anyone linked to them as the same person; `member` is the pair guest they concern. */
  earlier: { row: MatchRow; member: string }[];
} | null> {
  const database = getDatabase();
  const [match] = await database.select().from(eventMatches)
    .where(and(eq(eventMatches.id, matchId), eq(eventMatches.eventId, eventId))).limit(1);
  if (!match) return null;
  const pair = [match.guestLowId, match.guestHighId];
  const blocks = await database.select({ low: eventMatchBlocks.guestLowId, high: eventMatchBlocks.guestHighId, reason: eventMatchBlocks.reason })
    .from(eventMatchBlocks).where(and(eq(eventMatchBlocks.eventId, eventId), or(inArray(eventMatchBlocks.guestLowId, pair), inArray(eventMatchBlocks.guestHighId, pair))));
  const pairGuests = await database.select({ id: eventGuests.id, personId: eventGuests.personId }).from(eventGuests)
    .where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, pair)));
  const linkedRows = await database.select({ id: eventGuests.id, personId: eventGuests.personId }).from(eventGuests)
    .where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.personId, pairGuests.map((guest) => guest.personId))));
  const memberOf = new Map(linkedRows.flatMap((linked) => {
    const member = pairGuests.find((guest) => guest.personId === linked.personId);
    return member ? [[linked.id, member.id] as const] : [];
  }));
  const linkedIds = [...memberOf.keys()];
  const earlierRows = await database.select().from(eventMatches).where(and(
    eq(eventMatches.eventId, eventId), ne(eventMatches.id, matchId),
    or(inArray(eventMatches.guestLowId, linkedIds), inArray(eventMatches.guestHighId, linkedIds)),
  )).orderBy(desc(eventMatches.createdAt)).limit(50);
  const earlier = earlierRows.map((row) => ({ row, member: memberOf.get(row.guestLowId) ?? memberOf.get(row.guestHighId)! }));
  const restrictions = blocks.flatMap((block) => [
    ...(pair.includes(block.low) ? [{ guestId: block.low, otherGuestId: block.high, reason: block.reason }] : []),
    ...(pair.includes(block.high) ? [{ guestId: block.high, otherGuestId: block.low, reason: block.reason }] : []),
  ]);
  const ids = [...new Set([...pair, ...restrictions.map((r) => r.otherGuestId), ...earlier.flatMap(({ row }) => [row.guestLowId, row.guestHighId])])];
  const guestRows = await database.select(guestColumns).from(eventGuests).where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, ids)));
  return { match, guests: new Map(guestRows.map((row) => [row.id, row])), restrictions, earlier };
}
