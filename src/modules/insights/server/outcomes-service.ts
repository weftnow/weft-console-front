import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDatabase, type WeftDatabase } from "@/infrastructure/database/client";
import {
  eventGuests, eventMatchCompletionChanges, eventMatchCompletions, eventMatches, eventOutcomesTracking, events,
} from "@/infrastructure/database/schema/events";
import { organizationMemberships } from "@/infrastructure/database/schema/identity";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchingEngineMode } from "@/modules/network/server/engine-mode";
import { canCreateEvent } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";
import type { MatchCompletion, OutcomesDay, OutcomesReport } from "../outcomes-report";
import { demoRecommendationOrdinals, readSimulatedOutcomes } from "./simulated-outcomes";

type Transaction = Parameters<Parameters<WeftDatabase["transaction"]>[0]>[0];
type OrganizationScope = { userId: string; organizationId: string };
type EventScope = OrganizationScope & { eventId: string };
type MatchScope = EventScope & { matchId: string };

const readSnapshot = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

function forbidden() {
  return new ApplicationError("FORBIDDEN", "You do not have access to manage outcomes for this organization.");
}

function eventNotFound() {
  return new ApplicationError("NOT_FOUND", "Event not found.");
}

function matchNotFound() {
  return new ApplicationError("NOT_FOUND", "Match not found.");
}

function validateScope({ userId, organizationId }: OrganizationScope) {
  if (!uuidSchema.safeParse(userId).success || !uuidSchema.safeParse(organizationId).success) throw forbidden();
}

function validateEventId(eventId: string) {
  if (!uuidSchema.safeParse(eventId).success) throw eventNotFound();
}

async function requireOrganizer(tx: Transaction, { userId, organizationId }: OrganizationScope, write = false) {
  const membership = tx.select({ role: organizationMemberships.role, active: organizationMemberships.active })
    .from(organizationMemberships)
    .where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.userId, userId)));
  const [actor] = await (write ? membership.for("share") : membership);
  if (!canCreateEvent(actor ?? null)) throw forbidden();
}

async function requireEvent(tx: Transaction, { organizationId, eventId }: EventScope, write = false) {
  const event = tx.select({ id: events.id }).from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId)));
  // The matching feed takes the same event lock before creating or revoking matches.
  const [found] = await (write ? event.for("update") : event);
  if (!found) throw eventNotFound();
}

function requireRealWrites() {
  if (matchingEngineMode() === "simulation") {
    throw new ApplicationError("CONFLICT", "Outcomes cannot be changed while matching is simulated.", undefined, { kind: "SIMULATION_ACTIVE" });
  }
}

async function readMatch(tx: Transaction, { eventId, matchId }: MatchScope) {
  const [match] = await tx.select({ status: eventMatches.status, recommendationId: eventMatches.engineRecommendationId })
    .from(eventMatches).where(and(eq(eventMatches.eventId, eventId), eq(eventMatches.id, matchId)));
  // Existing simulated feeds can persist matches. The deterministic ID survives both mode changes and contact edits.
  if (!match || demoRecommendationOrdinals(eventId).has(match.recommendationId)) throw matchNotFound();
  return match;
}

async function readTracking(tx: Transaction, eventId: string) {
  const [tracking] = await tx.select({ startedAt: eventOutcomesTracking.startedAt })
    .from(eventOutcomesTracking).where(eq(eventOutcomesTracking.eventId, eventId));
  return tracking?.startedAt.toISOString() ?? null;
}

async function readCompletion(tx: Transaction, { eventId, matchId }: MatchScope): Promise<MatchCompletion> {
  const trackingStartedAt = await readTracking(tx, eventId);
  const [saved] = await tx.select({ completedAt: eventMatchCompletions.completedAt, revision: eventMatchCompletions.revision })
    .from(eventMatchCompletions).where(and(eq(eventMatchCompletions.eventId, eventId), eq(eventMatchCompletions.matchId, matchId)));
  return { trackingStartedAt, completedAt: saved?.completedAt?.toISOString() ?? null, revision: saved?.revision ?? 0 };
}

export async function startOutcomesTracking(input: EventScope): Promise<{ trackingStartedAt: string }> {
  validateScope(input);
  validateEventId(input.eventId);
  return getDatabase().transaction(async (tx) => {
    await requireOrganizer(tx, input, true);
    await requireEvent(tx, input, true);
    requireRealWrites();
    await tx.insert(eventOutcomesTracking).values({ eventId: input.eventId, startedBy: input.userId }).onConflictDoNothing();
    const [tracking] = await tx.select({ startedAt: eventOutcomesTracking.startedAt })
      .from(eventOutcomesTracking).where(eq(eventOutcomesTracking.eventId, input.eventId));
    return { trackingStartedAt: tracking.startedAt.toISOString() };
  });
}

export async function getMatchCompletion(input: MatchScope): Promise<MatchCompletion> {
  validateScope(input);
  validateEventId(input.eventId);
  if (!uuidSchema.safeParse(input.matchId).success) throw matchNotFound();
  return getDatabase().transaction(async (tx) => {
    await requireOrganizer(tx, input);
    await requireEvent(tx, input);
    if (matchingEngineMode() === "simulation") {
      const eventId = input.eventId.toLowerCase();
      const event = (await readSimulatedOutcomes(tx, input.organizationId, [eventId])).get(eventId);
      const completedAt = event?.matches.get(input.matchId.toLowerCase());
      if (!event || completedAt === undefined) throw matchNotFound();
      return { trackingStartedAt: event.trackingStartedAt, completedAt, revision: 0, simulated: true };
    }
    await readMatch(tx, input);
    return readCompletion(tx, input);
  }, readSnapshot);
}

export async function setMatchCompletion(input: MatchScope & { completed: boolean; expectedRevision: number }): Promise<MatchCompletion> {
  validateScope(input);
  validateEventId(input.eventId);
  const { eventId, matchId, userId, completed, expectedRevision } = input;
  if (!uuidSchema.safeParse(matchId).success) throw matchNotFound();
  if (typeof completed !== "boolean" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the completion change.");
  }
  return getDatabase().transaction(async (tx) => {
    await requireOrganizer(tx, input, true);
    await requireEvent(tx, input, true);
    requireRealWrites();
    const match = await readMatch(tx, input);
    const current = await readCompletion(tx, input);
    if (!current.trackingStartedAt) {
      throw new ApplicationError("CONFLICT", "Start outcomes tracking before recording a completion.", undefined, { kind: "TRACKING_NOT_STARTED" });
    }
    const sameState = (current.completedAt !== null) === completed;
    // The caller may have lost the response to the immediately preceding successful transition.
    if (sameState && (current.revision === expectedRevision || current.revision === expectedRevision + 1)) return current;
    if (current.revision !== expectedRevision) {
      throw new ApplicationError("CONFLICT", "This completion changed. Review the latest saved value.", undefined, { kind: "STALE_VERSION", current });
    }
    if (completed && match.status === "revoked") {
      throw new ApplicationError("CONFLICT", "A revoked match cannot be confirmed.", undefined, { kind: "MATCH_REVOKED" });
    }
    const revision = current.revision + 1;
    const [saved] = await tx.insert(eventMatchCompletions)
      .values({ eventId, matchId, revision, completedAt: completed ? sql`date_trunc('milliseconds', clock_timestamp())` : null })
      .onConflictDoUpdate({
        target: [eventMatchCompletions.eventId, eventMatchCompletions.matchId],
        set: { revision, completedAt: sql`excluded.completed_at` },
      })
      .returning({ completedAt: eventMatchCompletions.completedAt });
    await tx.insert(eventMatchCompletionChanges).values({
      eventId, matchId, revision, completed, changedBy: userId, changedAt: saved.completedAt ?? undefined,
    });
    return { trackingStartedAt: current.trackingStartedAt, completedAt: saved.completedAt?.toISOString() ?? null, revision };
  });
}

type EventCounts = { event_id: string; completed_introductions: number; people_introduced: number };

async function readEventCounts(tx: Transaction, { organizationId, eventId }: { organizationId: string; eventId?: string }) {
  // Guest records can be linked after a meeting. Their current event-local person IDs are canonical.
  // Revocation only changes matching eligibility, so it does not participate in this query.
  const { rows } = await tx.execute<EventCounts>(sql`
    select m.event_id, count(distinct m.id)::int as completed_introductions,
      count(distinct participant.person_id)::int as people_introduced
    from ${eventMatchCompletions} c
    join ${eventMatches} m on m.id = c.match_id and m.event_id = c.event_id
    join ${events} e on e.id = m.event_id
    join ${eventGuests} low on low.id = m.guest_low_id and low.event_id = m.event_id
    join ${eventGuests} high on high.id = m.guest_high_id and high.event_id = m.event_id
    cross join lateral (values (low.person_id), (high.person_id)) participant(person_id)
    where c.completed_at is not null and e.organization_id = ${organizationId}
      ${eventId ? sql`and e.id = ${eventId}` : sql``}
    group by m.event_id
  `);
  return new Map(rows.map((row) => [row.event_id, row]));
}

async function readRecordedDays(tx: Transaction, { organizationId, eventId }: OrganizationScope & { eventId?: string }) {
  const { rows } = await tx.execute<OutcomesDay>(sql`
    select to_char(c.completed_at at time zone 'UTC', 'YYYY-MM-DD') as date, count(*)::int as count
    from ${eventMatchCompletions} c
    join ${events} e on e.id = c.event_id
    where c.completed_at is not null and e.organization_id = ${organizationId}
      ${eventId ? sql`and e.id = ${eventId}` : sql``}
    group by 1
    order by 1
  `);
  return rows;
}

function demoRecordedDays(outcomes: Awaited<ReturnType<typeof readSimulatedOutcomes>>): OutcomesDay[] {
  const counts = new Map<string, number>();
  for (const { matches } of outcomes.values()) {
    for (const completedAt of matches.values()) {
      if (!completedAt) continue;
      const date = completedAt.slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    }
  }
  return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}

export async function getOutcomesReport(input: OrganizationScope & { eventId?: string; includeTimeline?: boolean }): Promise<OutcomesReport> {
  validateScope(input);
  if (input.eventId !== undefined) validateEventId(input.eventId);
  return getDatabase().transaction(async (tx) => {
    await requireOrganizer(tx, input);
    const simulated = matchingEngineMode() === "simulation";
    const selectedEventId = input.eventId?.toLowerCase() ?? null;
    const eventFields = { eventId: events.id, eventName: events.name, startsAt: events.startsAt, timezone: events.timezone };
    const order = [desc(events.startsAt), events.id] as const;
    const scope = eq(events.organizationId, input.organizationId);
    const allEvents = simulated
      ? await tx.select({ ...eventFields, trackingStartedAt: sql<null>`null` }).from(events).where(scope).orderBy(...order)
      : await tx.select({ ...eventFields, trackingStartedAt: eventOutcomesTracking.startedAt }).from(events)
        .leftJoin(eventOutcomesTracking, eq(eventOutcomesTracking.eventId, events.id)).where(scope).orderBy(...order);
    const eventOptions = allEvents.map(({ eventId, eventName }) => ({ eventId, eventName }));
    const scopedEvents = selectedEventId ? allEvents.filter(({ eventId }) => eventId === selectedEventId) : allEvents;
    if (selectedEventId && !scopedEvents.length) throw eventNotFound();
    const demo = simulated ? await readSimulatedOutcomes(tx, input.organizationId, scopedEvents.map(({ eventId }) => eventId)) : null;
    const counts = simulated ? null : await readEventCounts(tx, input);
    const reportEvents = scopedEvents.map((event) => {
      const demoEvent = demo?.get(event.eventId);
      const actual = counts?.get(event.eventId);
      return {
        ...event,
        startsAt: event.startsAt.toISOString(),
        trackingStartedAt: demoEvent?.trackingStartedAt ?? event.trackingStartedAt?.toISOString() ?? null,
        completedIntroductions: demoEvent?.completedIntroductions ?? actual?.completed_introductions ?? 0,
        peopleIntroduced: demoEvent?.people.size ?? actual?.people_introduced ?? 0,
      };
    });
    return {
      eventOptions,
      events: reportEvents,
      totals: {
        completedIntroductions: reportEvents.reduce((sum, event) => sum + event.completedIntroductions, 0),
        trackedEvents: reportEvents.filter((event) => event.trackingStartedAt !== null).length,
        totalEvents: reportEvents.length,
      },
      recordedByDay: input.includeTimeline ? demo ? demoRecordedDays(demo) : await readRecordedDays(tx, input) : [],
      selectedEventId,
      ...(simulated ? { simulated: true as const } : {}),
    };
  }, readSnapshot);
}
