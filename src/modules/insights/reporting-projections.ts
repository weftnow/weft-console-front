import { reportGroups, type ReportEvent, type ReportProjection, type ReportQuery } from "./reporting-contract";
import { projectRelationships, projectSeries, scopeEvents } from "./reporting-across-projections";
import { projectCoverage, projectDemand, projectFollowThrough, projectGoals } from "./reporting-event-projections";
import { compareEvents, compareText, keyLabel, prepareReportEvent, textLabel, type PreparedReportEvent } from "./reporting-source";

function projectSponsors(source: PreparedReportEvent | undefined, query: ReportQuery): ReportProjection {
  const projection: ReportProjection = {
    id: "sponsor-outcomes",
    status: "unavailable",
    columns: ["actual", "target"],
    rows: [],
  };
  if (!source) return projection;

  const sponsors = (source.event.evidence?.sponsors ?? [])
    .filter((sponsor) => query.sponsor === undefined || sponsor.key === query.sponsor)
    .sort((a, b) => compareText(a.label, b.label) || compareText(a.key, b.key));

  const objectives = sponsors.flatMap((sponsor) => sponsor.objectives
    .toSorted((a, b) => compareText(a.label, b.label) || compareText(a.key, b.key))
    .map((objective) => {
      const id = `${sponsor.key}:${objective.key}`;
      const matches = [...new Set(objective.matchIds)].sort(compareText).flatMap((matchId) => {
        const match = source.matches.get(matchId);
        if (!match) return [];
        if (objective.measure === "meetings" && !source.completed.has(matchId)) return [];
        if (objective.measure === "next_steps" && !objective.nextStep) return [];
        return [match];
      });
      const actual = matches.length;
      const target = objective.target;
      const label = query.sponsor === undefined ? `${sponsor.label} · ${objective.label}` : objective.label;
      const count = target === null ? { count: actual } : { count: actual, total: target };

      return {
        row: { id, label: textLabel(label), values: [actual, target], counts: [count] },
        summary: {
          id,
          cells: [
            textLabel(sponsor.label), textLabel(objective.label), keyLabel(objective.measure), textLabel(actual),
            target === null ? keyLabel("unknown") : textLabel(target),
            objective.nextStep ? textLabel(objective.nextStep) : keyLabel("unknown"),
          ],
        },
        detail: {
          columns: ["personA", "personB", "measure", "method", "status", "nextStep"],
          rows: matches.map((match) => ({
            id: match.id,
            cells: [
              ...match.personIds.map((personId) => textLabel(source.people.get(personId)!.name)),
              keyLabel(objective.measure),
              keyLabel(match.method),
              keyLabel(source.completed.has(match.id) ? "completed" : "pending"),
              objective.nextStep ? textLabel(objective.nextStep) : keyLabel("unknown"),
            ],
          })),
        },
      };
    }));

  if (objectives.length === 0) return projection;
  const focused = objectives.find(({ row }) => row.id === query.detail) ??
    (objectives.length === 1 ? objectives[0] : undefined);
  return {
    ...projection,
    status: "ready",
    measure: focused?.row.counts[0],
    rows: objectives.map(({ row }) => row),
    breakdown: {
      columns: ["sponsor", "objective", "measure", "actual", "target", "nextStep"],
      rows: objectives.map(({ summary }) => summary),
    },
    details: Object.fromEntries(objectives.map(({ row, detail }) => [row.id, detail])),
  };
}

// Sources are the already authorized events for a single organization.
export function buildReportingProjections(sources: ReportEvent[], query: ReportQuery, now: Date): ReportProjection[] {
  const timestamp = now.getTime();
  const completed = sources.filter((event) => Date.parse(event.endsAt) <= timestamp).sort(compareEvents);

  if (query.view === "across") {
    const scope = scopeEvents(completed, query);
    return reportGroups.across.map((id) => id === "series"
      ? projectSeries(scope, query, timestamp)
      : projectRelationships(completed, scope, timestamp));
  }

  const selected = query.eventId === undefined
    ? completed.reduce<ReportEvent | undefined>((latest, event) =>
      !latest || Date.parse(event.endsAt) >= Date.parse(latest.endsAt) ? event : latest, undefined)
    : sources.find((event) => event.id === query.eventId);
  const source = selected && prepareReportEvent(selected, timestamp);

  return reportGroups[query.view].map((id) => {
    switch (id) {
      case "goals": return projectGoals(source, query.segment);
      case "demand": return projectDemand(source, query.segment, timestamp);
      case "follow-through": return projectFollowThrough(source, query.window, timestamp);
      case "coverage": return projectCoverage(source, query.segment);
      case "sponsor-outcomes": return projectSponsors(source, query);
    }
  });
}
