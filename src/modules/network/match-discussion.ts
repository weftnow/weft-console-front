import type { MatchDetailDto } from "./matches-schemas";
import { EXECUTIVE_GROWTH_MATCHES } from "./simulation/executive-growth-matches";
import { EXECUTIVE_OPERATIONS_MATCHES } from "./simulation/executive-operations-matches";

export type DiscussionTopics = {
  heading?: string;
  problem?: string;
  whyMatch?: string;
  business: string;
  life: string;
};

export type MatchDiscussion = {
  why: string;
  forA: DiscussionTopics;
  forB: DiscussionTopics;
};

// The feed already preserves string records across sync and storage. Reserve these records for
// curated simulation copy so it can travel alongside the evidence without a migration.
const PAIR_REASON = "simulation_pair_reason";
const GUEST_TOPICS = "simulation_guest_topics";

function topicRecord(guestId: string, topics: DiscussionTopics): Record<string, string> {
  return {
    kind: GUEST_TOPICS,
    guestId,
    business: topics.business,
    life: topics.life,
    ...(topics.heading ? { heading: topics.heading } : {}),
    ...(topics.problem ? { problem: topics.problem } : {}),
    ...(topics.whyMatch ? { whyMatch: topics.whyMatch } : {}),
  };
}

export function discussionRecords({ why, forA, forB }: MatchDiscussion, idA: string, idB: string): Record<string, string>[] {
  return [
    { kind: PAIR_REASON, text: why },
    topicRecord(idA, forA),
    topicRecord(idB, forB),
  ];
}

function legacySimulationUpgrade(
  evidence: Record<string, string>[],
  lowId: string,
  highId: string,
  storedWhy: string,
): { why: string; low: DiscussionTopics; high: DiscussionTopics } | null {
  const quotesByGuest = new Map<string, Set<string>>();
  for (const item of evidence) {
    if (!item.guestId || !item.quote) continue;
    const existing = quotesByGuest.get(item.guestId) ?? new Set<string>();
    existing.add(item.quote);
    quotesByGuest.set(item.guestId, existing);
  }
  const lowQuotes = quotesByGuest.get(lowId);
  const highQuotes = quotesByGuest.get(highId);
  if (!lowQuotes || !highQuotes) return null;

  const curated = [...EXECUTIVE_GROWTH_MATCHES, ...EXECUTIVE_OPERATIONS_MATCHES];
  for (const pair of curated) {
    const aQuotes = pair.evidence.filter((e) => e.who === "a").map((e) => e.quote);
    const bQuotes = pair.evidence.filter((e) => e.who === "b").map((e) => e.quote);
    const lowIsA = aQuotes.every((q) => lowQuotes.has(q)) && bQuotes.every((q) => highQuotes.has(q));
    const lowIsB = bQuotes.every((q) => lowQuotes.has(q)) && aQuotes.every((q) => highQuotes.has(q));
    if (!lowIsA && !lowIsB) continue;

    const looksSpanish = /\b(?:para|con|cómo|qué|mientras|además|su|sus|empresa|equipos)\b/i.test(storedWhy)
      && !/\b(?:and|the|with|while|how|who|both)\b/i.test(storedWhy);
    const discussion = looksSpanish ? pair.es.discussion : pair.discussion;
    return {
      why: discussion.why,
      low: lowIsA ? discussion.forA : discussion.forB,
      high: lowIsA ? discussion.forB : discussion.forA,
    };
  }
  return null;
}

function toGuestTopic(guestId: string, topics: DiscussionTopics) {
  return {
    guestId,
    ...(topics.heading?.trim() ? { heading: topics.heading } : {}),
    ...(topics.problem?.trim() ? { problem: topics.problem } : {}),
    ...(topics.whyMatch?.trim() ? { whyMatch: topics.whyMatch } : {}),
    business: topics.business,
    life: topics.life,
  };
}

export function readMatchDiscussion(records: Record<string, string>[], lowId: string, highId: string): Pick<MatchDetailDto, "evidence" | "discussion"> {
  const evidence = records.filter(({ kind }) => kind !== PAIR_REASON && kind !== GUEST_TOPICS);
  const why = records.find(({ kind }) => kind === PAIR_REASON)?.text;
  const findTopics = (id: string) => records.find(({ kind, guestId }) => kind === GUEST_TOPICS && guestId === id);
  const low = findTopics(lowId);
  const high = findTopics(highId);
  if (!why?.trim() || !low?.business?.trim() || !low.life?.trim() || !high?.business?.trim() || !high.life?.trim()) return { evidence };

  const hasStructured = Boolean(
    low.heading?.trim() && low.problem?.trim() && low.whyMatch?.trim()
    && high.heading?.trim() && high.problem?.trim() && high.whyMatch?.trim(),
  );
  if (!hasStructured) {
    const upgraded = legacySimulationUpgrade(evidence, lowId, highId, why);
    if (upgraded) {
      return {
        evidence,
        discussion: {
          why: upgraded.why,
          topics: [toGuestTopic(lowId, upgraded.low), toGuestTopic(highId, upgraded.high)],
        },
      };
    }
  }

  return {
    evidence,
    discussion: {
      why,
      topics: [
        toGuestTopic(lowId, { heading: low.heading, problem: low.problem, whyMatch: low.whyMatch, business: low.business, life: low.life }),
        toGuestTopic(highId, { heading: high.heading, problem: high.problem, whyMatch: high.whyMatch, business: high.business, life: high.life }),
      ],
    },
  };
}
