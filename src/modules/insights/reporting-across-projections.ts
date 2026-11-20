import type { ReportBreakdown, ReportEvent, ReportProjection, ReportQuery } from "./reporting-contract";
import { projectCoverage, projectFollowThrough, projectGoals } from "./reporting-event-projections";
import {
  compareEvents,
  keyLabel,
  pairKey,
  prepareReportEvent,
  rate,
  textLabel,
  type PreparedReportEvent,
} from "./reporting-source";

function scopeBound(value: string | undefined, edge: "from" | "to") {
  if (value === undefined) return edge === "from" ? -Infinity : Infinity;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T${edge === "from" ? "00:00:00.000" : "23:59:59.999"}Z`);
  }
  return Date.parse(value);
}

export function scopeEvents(events: ReportEvent[], query: ReportQuery) {
  const from = scopeBound(query.from, "from");
  const to = scopeBound(query.to, "to");
  return events.filter((event) => {
    const start = Date.parse(event.startsAt);
    return start >= from && start <= to &&
      (query.series === undefined || event.evidence?.series?.key === query.series);
  });
}

export function projectSeries(events: ReportEvent[], query: ReportQuery, now: number): ReportProjection {
  const series = query.series ?? events.findLast((event) => event.evidence?.series)?.evidence?.series?.key;
  const editions = series === undefined ? [] : events.filter((event) => event.evidence?.series?.key === series);
  const results = editions.map((event) => {
    const source = prepareReportEvent(event, now);
    switch (query.metric) {
      case "goals": return projectGoals(source, query.segment);
      case "coverage": return projectCoverage(source, query.segment);
      case "follow-through": return projectFollowThrough(source, query.window, now);
    }
  });
  const latest = results.at(-1);
  const latestMeasured = results.findLast((result) => result.measure);
  const previous = results.slice(0, -1).findLast((result) => result.measure && result.basis === latest?.basis);
  const currentRate = latest?.measure ? rate(latest.measure) : null;
  const previousRate = previous?.measure ? rate(previous.measure) : null;
  const rows = editions.map((event, index) => {
    const { measure, basis } = results[index];
    // The chart has a single rate axis. The evidence table retains other attendance bases.
    const score = basis === latestMeasured?.basis ? measure : undefined;
    const params = new URLSearchParams({
      view: "event", eventId: event.id, report: query.metric, window: String(query.window),
    });
    if (query.segment !== undefined && query.metric !== "follow-through") params.set("segment", query.segment);
    return {
      id: event.id,
      label: textLabel(event.name),
      values: [score ? rate(score) : null],
      counts: score ? [score] : undefined,
      href: `/outcomes/reports?${params}`,
    };
  });

  return {
    id: "series",
    status: latestMeasured ? "ready" : latest?.status === "collecting" ? "collecting" : "unavailable",
    measure: latest?.measure,
    responseCoverage: latest?.responseCoverage,
    basis: latestMeasured?.basis,
    delta: currentRate !== null && previousRate !== null ? currentRate - previousRate : undefined,
    columns: ["rate"],
    rows,
    breakdown: {
      columns: ["edition", "date", "count", "base", "basis", "status"],
      rows: rows.map(({ id, label, href }, index) => {
        const { measure, basis, status } = results[index];
        return {
          id,
          href,
          cells: [
            label, textLabel(editions[index].startsAt),
            measure ? textLabel(measure.count) : keyLabel("unknown"),
            measure?.total === undefined ? keyLabel("unknown") : textLabel(measure.total),
            keyLabel(basis ?? query.metric), keyLabel(status),
          ],
        };
      }),
    },
  };
}

type MatchMethod = ReportEvent["matches"][number]["method"];
type Interaction = {
  source: PreparedReportEvent;
} & ({ evidence: "completed"; method: MatchMethod } | { evidence: "reconnection"; method?: undefined });

function prepareRelationships(event: ReportEvent, now: number) {
  const source = prepareReportEvent(event, now);
  const checkedIn = new Map<string, string>();
  for (const participant of source.participants.values()) {
    if (participant.attended === true && participant.networkKey) {
      checkedIn.set(participant.personId, participant.networkKey);
    }
  }

  function networkPair([a, b]: [string, string]): [string, string] | undefined {
    const aKey = checkedIn.get(a);
    const bKey = checkedIn.get(b);
    return aKey && bKey && aKey !== bKey ? [aKey, bKey] : undefined;
  }

  const completions = new Map<string, { keys: [string, string]; names: [string, string]; method: MatchMethod }>();
  for (const [match] of source.completedPairs.values()) {
    const keys = networkPair(match.personIds);
    if (!keys || completions.has(pairKey(keys))) continue;
    const [a, b] = match.personIds;
    completions.set(pairKey(keys), {
      keys,
      names: [source.people.get(a)!.name, source.people.get(b)!.name],
      method: match.method,
    });
  }

  const reconnections = new Set<string>();
  for (const personIds of event.evidence?.reconnections ?? []) {
    const keys = networkPair(personIds);
    if (keys) reconnections.add(pairKey(keys));
  }

  return { source, present: new Set(checkedIn.values()), completions, reconnections };
}

export function projectRelationships(events: ReportEvent[], scoped: ReportEvent[], now: number): ReportProjection {
  const scope = new Set(scoped.map((event) => event.id));
  const history = events.map((event) => prepareRelationships(event, now));
  const origins = new Map<string, {
    keys: [string, string];
    names: [string, string];
    first: Interaction;
  }>();

  for (const { source, completions } of history) {
    for (const [key, { keys, names, method }] of completions) {
      if (!origins.has(key)) origins.set(key, { keys, names, first: { source, evidence: "completed", method } });
    }
  }

  const detailColumns = [
    "personA", "personB", "firstEvent", "firstDate", "firstEvidence", "firstMethod",
    "laterEvent", "laterDate", "laterEvidence", "laterMethod",
  ];
  const cells = new Map<string, { opportunities: number; firstInteractions: number; detail: ReportBreakdown }>();
  const matrixOrigins = new Set(scope);
  let pairsWithOpportunity = 0;
  let continued = 0;

  const laterEvents = history.filter(({ source }) => scope.has(source.event.id));
  for (const [pair, { keys: [a, b], names, first }] of origins) {
    const origin = first.source.event;
    const laterInteractions: Interaction[] = [];
    let hadOpportunity = false;
    for (const later of laterEvents) {
      if (later.source.startsAt <= first.source.startsAt || !later.present.has(a) || !later.present.has(b)) continue;
      hadOpportunity = true;
      matrixOrigins.add(origin.id);
      const cellId = `${origin.id}:${later.source.event.id}`;
      const cell = cells.get(cellId) ?? {
        opportunities: 0,
        firstInteractions: 0,
        detail: { columns: detailColumns, rows: [] },
      };
      cell.opportunities += 1;
      cells.set(cellId, cell);

      const method = later.completions.get(pair)?.method;
      if (method) laterInteractions.push({ source: later.source, evidence: "completed", method });
      else if (later.reconnections.has(pair)) laterInteractions.push({ source: later.source, evidence: "reconnection" });
    }

    if (hadOpportunity) pairsWithOpportunity += 1;
    if (laterInteractions.length === 0) continue;
    continued += 1;
    const cellId = `${origin.id}:${laterInteractions[0].source.event.id}`;
    const cell = cells.get(cellId)!;
    cell.firstInteractions += 1;
    for (const later of laterInteractions) {
      const edition = later.source.event;
      cell.detail.rows.push({
        id: JSON.stringify([pair, edition.id]),
        cells: [
          ...names.map(textLabel), textLabel(origin.name), textLabel(origin.startsAt), keyLabel(first.evidence),
          keyLabel(first.method ?? "unknown"),
          textLabel(edition.name), textLabel(edition.startsAt), keyLabel(later.evidence), keyLabel(later.method ?? "unknown"),
        ],
      });
    }
  }

  const columns = scoped.map((event) => event.id);
  const rows = events.filter((event) => matrixOrigins.has(event.id)).sort(compareEvents).map((event) => {
    const matrixRow = columns.map((id) => cells.get(`${event.id}:${id}`));
    return {
      id: event.id,
      label: textLabel(event.name),
      values: matrixRow.map((cell) => cell?.firstInteractions ?? null),
      counts: matrixRow.map((cell) => ({ count: cell?.firstInteractions ?? 0, total: cell?.opportunities })),
    };
  });

  const names = new Map(events.map((event) => [event.id, event.name]));
  return {
    id: "relationships",
    status: pairsWithOpportunity ? "ready" : "unavailable",
    measure: pairsWithOpportunity ? { count: continued, total: pairsWithOpportunity } : undefined,
    columns,
    rows,
    matrix: scoped.map((event) => ({ id: event.id, label: event.name })),
    breakdown: {
      columns: ["firstEvent", "laterEvent", "continued", "opportunities"],
      rows: rows.flatMap((row) => columns.flatMap((column) => {
        const id = `${row.id}:${column}`;
        const cell = cells.get(id);
        return cell ? [{
          id,
          cells: [row.label, textLabel(names.get(column)!), textLabel(cell.firstInteractions), textLabel(cell.opportunities)],
        }] : [];
      })),
    },
    details: Object.fromEntries([...cells].map(([id, cell]) => [id, cell.detail])),
  };
}
