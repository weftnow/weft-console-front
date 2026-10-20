import "server-only";
import { createHash } from "node:crypto";
import { uuidSchema } from "@/modules/events/event-schemas";
import { engineMatchingFeedSchema, type MatchingFeedEntry, type MatchingFeedResult } from "../matching-feed-schemas";
import { engineMatchingStatusSchema, type MatchingStatusResult } from "../matching-status-schemas";
import { DEMO_MATCHES, MAX_DEMO_MATCHES, type DemoMatch } from "../simulation/demo-matches";
import { FEED_PAGE_LIMIT } from "./matching-feed-client";
import * as repository from "./simulation-repository";

/** Seconds after the latest saved change: waiting until WAITING_MS, running until FINISH_MS, then finished. */
export const WAITING_MS = 6_000;
export const FINISH_MS = 20_000;
/** Revoked entries sit above every issued `seq` (1..99) and keep the order of the changes that caused them. */
export const REVOCATION_SEQ_BASE = 1_000;

type Dependencies = {
  latestChangeAt: typeof repository.latestChangeAt;
  listChanges: typeof repository.listChanges;
  findGuests: typeof repository.findGuestsByEmails;
  listBlockedPairs: typeof repository.listBlockedPairs;
  now: () => Date;
};
const defaults: Dependencies = {
  latestChangeAt: repository.latestChangeAt,
  listChanges: repository.listChanges,
  findGuests: repository.findGuestsByEmails,
  listBlockedPairs: repository.listBlockedPairs,
  now: () => new Date(),
};

/** Deterministic version-4-shaped UUID from the parts, so a run or recommendation keeps its id across requests. */
export function deterministicUuid(...parts: string[]): string {
  const bytes = createHash("sha256").update(parts.join("\u0000")).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const simulatedRunId = (eventId: string, anchor: Date) => deterministicUuid("run", eventId, anchor.toISOString());

/** Reads the simulated run from the latest saved change; the simulator keeps no state of its own. */
export async function readSimulatedMatchingStatus(
  { eventId }: { organizationId: string; eventId: string },
  dependencies: Dependencies = defaults,
): Promise<MatchingStatusResult> {
  const anchor = await dependencies.latestChangeAt(eventId);
  if (!anchor) {
    return { availability: "available", simulated: true, status: engineMatchingStatusSchema.parse({
      state: "idle", pendingChanges: 0, latestRun: null, lastFinishedRunId: null, nextAttemptAt: null, automaticEnabled: true,
    }) };
  }
  const age = Math.max(0, dependencies.now().getTime() - anchor.getTime());
  const runId = simulatedRunId(eventId, anchor);
  const startedAt = new Date(anchor.getTime() + WAITING_MS).toISOString();
  const base = { trigger: "change" as const, failure: null, createdAt: startedAt };
  const status = age < WAITING_MS
    ? { state: "waiting", pendingChanges: 1, latestRun: null, lastFinishedRunId: null }
    : age < FINISH_MS
      ? { state: "running", pendingChanges: 0, latestRun: { runId, status: "running", finishedAt: null, ...base }, lastFinishedRunId: null }
      : {
        state: "finished", pendingChanges: 0,
        latestRun: { runId, status: "finished", finishedAt: new Date(anchor.getTime() + FINISH_MS).toISOString(), ...base },
        lastFinishedRunId: runId,
      };
  return { availability: "available", simulated: true, status: engineMatchingStatusSchema.parse({ ...status, nextAttemptAt: null, automaticEnabled: true }) };
}

type Guest = repository.SimulatedGuest;

function recommendationFor(eventId: string, pair: DemoMatch, a: Guest, b: Guest) {
  const [low, lowSide, high, highSide] = a.id < b.id ? [a, pair.forA, b, pair.forB] as const : [b, pair.forB, a, pair.forA] as const;
  const idOf = (who: "a" | "b") => (who === "a" ? a.id : b.id);
  const both = <T>(lowValue: T, highValue: T): Record<string, T> => ({ [low.id]: lowValue, [high.id]: highValue });
  return {
    recommendationId: deterministicUuid("recommendation", eventId, pair.a, pair.b),
    guestLowId: low.id, guestHighId: high.id,
    profileVersions: both(low.profileVersion, high.profileVersion),
    directionalScores: both(lowSide.score, highSide.score),
    pairScore: pair.pairScore,
    benefits: both<string | null>(lowSide.benefit, highSide.benefit),
    evidence: pair.evidence.map((item) => ({ guestId: idOf(item.who), field: item.field, quote: item.quote })),
    missingInformation: both(lowSide.missingInformation, highSide.missingInformation),
    uncertainty: pair.uncertainty,
    shareableReasons: both<string | null>(lowSide.shareableReason, highSide.shareableReason),
    revokedAt: null as string | null,
    revocationReason: null as "guest_excluded" | "pair_blocked" | null,
  };
}

/** Position, among the event's changes, of the latest one satisfying the test; the last change when none does. */
function ordinalOf(changes: readonly repository.SimulatedChange[], test: (change: repository.SimulatedChange) => boolean): number {
  for (let index = changes.length - 1; index >= 0; index -= 1) if (test(changes[index])) return index;
  return Math.max(0, changes.length - 1);
}

/**
 * One page of the simulated feed. It is empty until the simulated run has finished, so a list read cannot show matches
 * early. Issued entries follow the fixture; revoked entries are rebuilt from current exclusions and blocks.
 */
export async function readSimulatedMatchingFeed(
  { eventId, after, limit = FEED_PAGE_LIMIT }: { organizationId: string; eventId: string; after: number; limit?: number },
  dependencies: Dependencies = defaults,
): Promise<MatchingFeedResult> {
  if (!uuidSchema.safeParse(eventId).success || !Number.isInteger(after) || after < 0 || !Number.isInteger(limit) || limit < 1 || limit > FEED_PAGE_LIMIT) {
    return { availability: "unavailable", reason: "invalid_response" };
  }
  const changes = await dependencies.listChanges(eventId);
  const anchor = changes.at(-1)?.createdAt;
  if (!anchor || dependencies.now().getTime() - anchor.getTime() < FINISH_MS) {
    return { availability: "available", feed: { entries: [], nextCursor: after } };
  }

  const fixture = DEMO_MATCHES.slice(0, MAX_DEMO_MATCHES);
  const guests = new Map((await dependencies.findGuests(eventId, [...new Set(fixture.flatMap((pair) => [pair.a, pair.b]))]))
    .map((guest) => [guest.normalizedEmail, guest]));
  const blocked = new Set((await dependencies.listBlockedPairs(eventId, [...guests.values()].map((guest) => guest.id))).map((pair) => pair.join()));
  const runId = simulatedRunId(eventId, anchor);

  const entries: MatchingFeedEntry[] = [];
  fixture.forEach((pair, index) => {
    const a = guests.get(pair.a);
    const b = guests.get(pair.b);
    if (!a || !b) return;
    const recommendation = recommendationFor(eventId, pair, a, b);
    entries.push({ seq: index + 1, kind: "issued", runId, recommendation });

    const excluded = [a, b].find((guest) => guest.networkingStatus === "excluded");
    const pairBlocked = blocked.has([recommendation.guestLowId, recommendation.guestHighId].join());
    if (!excluded && !pairBlocked) return;
    const ordinal = excluded
      ? ordinalOf(changes, (change) => change.kind === "guest_excluded" && change.guestIds.includes(excluded.id))
      : ordinalOf(changes, (change) => change.kind === "match_block_added" && change.guestIds.includes(a.id) && change.guestIds.includes(b.id));
    entries.push({
      seq: REVOCATION_SEQ_BASE + ordinal * 100 + index, kind: "revoked", runId,
      recommendation: { ...recommendation, revokedAt: changes[ordinal].createdAt.toISOString(), revocationReason: excluded ? "guest_excluded" : "pair_blocked" },
    });
  });

  // Two revocations can share an ordinal only through different pair indexes, so seq values are unique.
  const page = entries.filter((entry) => entry.seq > after).sort((x, y) => x.seq - y.seq).slice(0, limit);
  const parsed = engineMatchingFeedSchema.safeParse({ entries: page, nextCursor: page.at(-1)?.seq ?? after });
  if (!parsed.success) {
    console.warn("weft_matching_simulation_invalid_feed");
    return { availability: "unavailable", reason: "invalid_response" };
  }
  return { availability: "available", feed: parsed.data };
}
