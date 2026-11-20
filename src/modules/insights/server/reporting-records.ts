import "server-only";
import { and, eq, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { WeftDatabase } from "@/infrastructure/database/client";
import { eventGuests, eventMatchCompletions, eventMatches } from "@/infrastructure/database/schema/events";
import { deterministicUuid } from "@/modules/network/server/simulated-engine";
import { DEMO_FIXTURES } from "@/modules/network/simulation/demo-matches";
import type { ReportEvent } from "../reporting-contract";

export type ReportingTransaction = Parameters<Parameters<WeftDatabase["transaction"]>[0]>[0];
export type EventRecords = Pick<ReportEvent, "people" | "matches">;

// The simulator historically hashed the spelling of the event ID from the URL. PostgreSQL
// canonicalizes UUIDs, so for mixed-case URLs also recognize its immutable, localized selection copy.
function selectionCopy(score: number, uncertainty: string, benefits: (string | null)[]) {
  return JSON.stringify([score, uncertainty, ...benefits.sort()]);
}

const demoSelectionCopy = new Set(DEMO_FIXTURES.flatMap((fixture) => fixture.flatMap((pair) =>
  [pair, pair.es].map((copy) => selectionCopy(pair.pairScore, copy.uncertainty, [copy.forA.benefit, copy.forB.benefit])))));

// The caller obtains all event IDs from the authorized organization in this transaction.
export async function readEventRecords(tx: ReportingTransaction, eventIds: string[]) {
  const records = new Map<string, EventRecords>(eventIds.map((id) => [id, { people: [], matches: [] }]));
  if (!eventIds.length) return records;
  const ids = sql`${sql.param(eventIds)}::uuid[]`;

  // One roster person can have several guest rows. Any included row puts that person in the pool.
  // The first roster position supplies a stable display name even after records are linked.
  const people = await tx.selectDistinctOn([eventGuests.eventId, eventGuests.personId], {
    eventId: eventGuests.eventId,
    personId: eventGuests.personId,
    name: sql<string>`btrim(${eventGuests.firstName} || ' ' || ${eventGuests.lastName})`,
    eligible: sql<boolean>`bool_or(${eventGuests.networkingStatus} = 'included')
      over (partition by ${eventGuests.eventId}, ${eventGuests.personId})`,
  }).from(eventGuests).where(sql`${eventGuests.eventId} = any(${ids})`)
    .orderBy(eventGuests.eventId, eventGuests.personId, eventGuests.position);
  for (const { eventId, ...person } of people) records.get(eventId)!.people.push(person);

  const low = alias(eventGuests, "low_guest");
  const high = alias(eventGuests, "high_guest");
  const matches = await tx.select({
    eventId: eventMatches.eventId, id: eventMatches.id, recommendationId: eventMatches.engineRecommendationId,
    score: eventMatches.pairScore, uncertainty: eventMatches.uncertainty, benefits: eventMatches.benefits,
    low: low.personId, high: high.personId, method: eventMatches.introductionPath, completedAt: eventMatchCompletions.completedAt,
  }).from(eventMatches)
    .innerJoin(low, and(eq(low.id, eventMatches.guestLowId), eq(low.eventId, eventMatches.eventId)))
    .innerJoin(high, and(eq(high.id, eventMatches.guestHighId), eq(high.eventId, eventMatches.eventId)))
    .leftJoin(eventMatchCompletions, and(
      eq(eventMatchCompletions.eventId, eventMatches.eventId), eq(eventMatchCompletions.matchId, eventMatches.id),
    ))
    .where(and(sql`${eventMatches.eventId} = any(${ids})`, or(eq(eventMatches.status, "active"), isNotNull(eventMatchCompletions.completedAt))))
    .orderBy(eventMatches.eventId, eventMatches.id);

  // The simulator can persist recommendations. Its IDs remain recognizable after returning to engine mode.
  const demoIdsByEvent = new Map<string, Set<string>>();
  for (const match of matches) {
    let demoIds = demoIdsByEvent.get(match.eventId);
    if (!demoIds) {
      demoIds = new Set(DEMO_FIXTURES.flatMap((fixture) => fixture.map(({ a, b }) =>
        deterministicUuid("recommendation", match.eventId, a, b))));
      demoIdsByEvent.set(match.eventId, demoIds);
    }
    if (demoIds.has(match.recommendationId) ||
      demoSelectionCopy.has(selectionCopy(match.score, match.uncertainty, Object.values(match.benefits)))) continue;
    records.get(match.eventId)!.matches.push({
      id: match.id, personIds: [match.low, match.high], method: match.method,
      completedAt: match.completedAt?.toISOString() ?? null,
    });
  }
  return records;
}
