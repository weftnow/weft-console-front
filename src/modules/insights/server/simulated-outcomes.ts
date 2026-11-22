import "server-only";
import { sql } from "drizzle-orm";
import type { WeftDatabase } from "@/infrastructure/database/client";
import { eventGuests, eventMatches, events } from "@/infrastructure/database/schema/events";
import { deterministicUuid } from "@/modules/network/server/simulated-engine";
import { DEMO_FIXTURES, MAX_DEMO_MATCHES } from "@/modules/network/simulation/demo-matches";

const recordingDays = [0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6];
const dayInMilliseconds = 86_400_000;

export function demoRecommendationOrdinals(eventId: string) {
  return new Map(DEMO_FIXTURES.flatMap((fixture) => fixture.slice(0, MAX_DEMO_MATCHES).map(({ a, b }, index) => [
    deterministicUuid("recommendation", eventId.toLowerCase(), a, b), index + 1,
  ] as const)));
}

type DemoMatchRow = {
  event_id: string;
  match_id: string;
  recommendation_id: string;
  status: "active" | "revoked";
  created_at: string;
  low_person_id: string;
  high_person_id: string;
};

type SimulatedEventOutcomes = {
  trackingStartedAt: string;
  matches: Map<string, string | null>;
  completedIntroductions: number;
  people: Set<string>;
};

/** Read the pairs already materialized by the demo feed, without syncing it or using the outcomes tables. */
export async function readSimulatedOutcomes(db: Pick<WeftDatabase, "execute">, organizationId: string, eventIds: string[]) {
  const projected = new Map<string, SimulatedEventOutcomes>();
  if (eventIds.length === 0) return projected;

  const ordinals = new Map(eventIds.flatMap((eventId) => [...demoRecommendationOrdinals(eventId)]));
  const { rows } = await db.execute<DemoMatchRow>(sql`
    select m.event_id, m.id as match_id, m.engine_recommendation_id as recommendation_id, m.status, m.created_at,
      low.person_id as low_person_id, high.person_id as high_person_id
    from ${eventMatches} m
    join ${events} e on e.id = m.event_id
    join ${eventGuests} low on low.id = m.guest_low_id and low.event_id = m.event_id
    join ${eventGuests} high on high.id = m.guest_high_id and high.event_id = m.event_id
    where e.organization_id = ${organizationId}
      and e.id = any(${sql.param(eventIds)}::uuid[])
      and m.engine_recommendation_id = any(${sql.param([...ordinals.keys()])}::uuid[])
    order by m.created_at, m.id
  `);

  for (const row of rows) {
    const createdAt = new Date(row.created_at).toISOString();
    let event = projected.get(row.event_id);
    if (!event) {
      const trackingStartedAt = new Date(Date.parse(createdAt) - 6 * dayInMilliseconds).toISOString();
      event = { trackingStartedAt, matches: new Map(), completedIntroductions: 0, people: new Set() };
      projected.set(row.event_id, event);
    }
    // Two of every three fixture pairs complete. Use the fixture ordinal so blocking a pair never reshuffles the others.
    const ordinal = ordinals.get(row.recommendation_id)!;
    const completed = row.status === "active" && ordinal % 3 !== 0 && row.low_person_id !== row.high_person_id;
    if (completed) {
      const day = recordingDays[(ordinal - 1) % recordingDays.length];
      const recordedAt = new Date(Date.parse(event.trackingStartedAt) + day * dayInMilliseconds).toISOString();
      event.matches.set(row.match_id, recordedAt);
      event.completedIntroductions += 1;
      event.people.add(row.low_person_id);
      event.people.add(row.high_person_id);
    } else {
      event.matches.set(row.match_id, null);
    }
  }
  return projected;
}
