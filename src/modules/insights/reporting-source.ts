import type { ReportCount, ReportEvent, ReportingEvidence, ReportLabel } from "./reporting-contract";

type Participant = ReportingEvidence["participants"][number];
type Match = ReportEvent["matches"][number];
type CompletedMatch = Match & { completedAt: string };

export const keyLabel = (key: string): ReportLabel => ({ key });
export const textLabel = (value: string | number): ReportLabel => ({ text: String(value) });
export const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function rate({ count, total }: ReportCount): number | null {
  return total ? count / total * 100 : null;
}

export function pairKey([a, b]: [string, string]): string {
  return JSON.stringify(compareText(a, b) < 0 ? [a, b] : [b, a]);
}

export function groupBy<T, K>(items: Iterable<T>, getKey: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

// Conflicting recorded values leave the answer unknown. Missing values do not erase recorded ones.
export function agreedValue<T>(values: (T | null | undefined)[]): T | undefined {
  const recorded = new Set(values.filter((value) => value != null));
  return recorded.size === 1 ? recorded.values().next().value : undefined;
}

function mergeParticipants(personId: string, entries: Participant[]): Participant {
  return {
    personId,
    segment: agreedValue(entries.map((entry) => entry.segment)),
    networkKey: agreedValue(entries.map((entry) => entry.networkKey)),
    attended: agreedValue(entries.map((entry) => entry.attended)),
    surveyInvited: agreedValue(entries.map((entry) => entry.surveyInvited)),
    surveyResponded: agreedValue(entries.map((entry) => entry.surveyResponded)),
    goals: [...groupBy(entries.flatMap((entry) => entry.goals), (goal) => goal.kind)]
      .map(([kind, goals]) => ({ kind, result: agreedValue(goals.map((goal) => goal.result)) ?? null })),
  };
}

export function prepareReportEvent(event: ReportEvent, now: number) {
  const people = new Map<string, ReportEvent["people"][number]>();
  for (const person of event.people.toSorted((a, b) => compareText(a.name, b.name))) {
    const previous = people.get(person.personId);
    if (!previous || (!previous.eligible && person.eligible)) people.set(person.personId, person);
  }

  const participants = new Map<string, Participant>();
  for (const [personId, entries] of groupBy(event.evidence?.participants ?? [], (entry) => entry.personId)) {
    if (people.has(personId)) participants.set(personId, mergeParticipants(personId, entries));
  }

  const matches = new Map<string, Match>();
  const completed = new Map<string, CompletedMatch>();
  for (const match of event.matches) {
    const [a, b] = match.personIds;
    if (a === b || !people.has(a) || !people.has(b)) continue;
    matches.set(match.id, match);
    if (match.completedAt !== null && Date.parse(match.completedAt) <= now) {
      completed.set(match.id, { ...match, completedAt: match.completedAt });
    }
  }

  const completedPairs = groupBy([...completed.values()].sort((a, b) =>
    Date.parse(a.completedAt) - Date.parse(b.completedAt) || compareText(a.id, b.id)), (match) => pairKey(match.personIds));

  return {
    event,
    people,
    participants,
    matches,
    completed,
    completedPairs,
    startsAt: Date.parse(event.startsAt),
    endsAt: Date.parse(event.endsAt),
    tracking: event.trackingStartedAt !== null && Date.parse(event.trackingStartedAt) <= now,
  };
}

export type PreparedReportEvent = ReturnType<typeof prepareReportEvent>;

export function compareEvents(a: ReportEvent, b: ReportEvent) {
  return Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
    Date.parse(a.endsAt) - Date.parse(b.endsAt) || compareText(a.id, b.id);
}

export function segmentOptions(segments: Iterable<string | undefined>) {
  return [...new Set(segments)].filter((segment) => segment !== undefined)
    .sort(compareText).map((label) => ({ key: label, label }));
}

export function segmentLabel(segment: string | undefined) {
  return segment === undefined ? keyLabel("unsegmented") : textLabel(segment);
}

export function compareSegments(a: string | undefined, b: string | undefined) {
  if (a === undefined) return b === undefined ? 0 : 1;
  return b === undefined ? -1 : compareText(a, b);
}
