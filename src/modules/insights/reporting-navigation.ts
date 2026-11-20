import { reportGroups, type ReportId, type ReportQuery, type ReportView, type TrendMetric } from "./reporting-contract";
import { parseOutcomesEventId } from "./outcomes-navigation";

export const reportsPath = "/outcomes/reports";

export function reportsHref(eventId?: string): string {
  return eventId ? `${reportsPath}?eventId=${encodeURIComponent(eventId)}` : reportsPath;
}

type Values = Record<string, string | string[] | undefined>;

function single(value: Values[string], max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : undefined;
}

function date(value: Values[string]): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

export function parseReportQuery(values: Values): ReportQuery | null {
  const event = parseOutcomesEventId(values.eventId);
  if (event.kind === "invalid") return null;

  const view: ReportView = values.view === "across" || values.view === "sponsors" ? values.view : "event";
  const report = (reportGroups[view] as readonly ReportId[]).find((id) => id === values.report);
  const metric: TrendMetric = values.metric === "goals" || values.metric === "follow-through" ? values.metric : "coverage";
  const from = view === "across" ? date(values.from) : undefined;
  const to = view === "across" ? date(values.to) : undefined;

  return {
    view,
    report,
    eventId: event.kind === "event" ? event.eventId : undefined,
    series: view === "across" ? single(values.series, 80) : undefined,
    from,
    to: from && to && to < from ? undefined : to,
    sponsor: view === "sponsors" ? single(values.sponsor, 80) : undefined,
    segment: view === "event" ? single(values.segment, 120) : undefined,
    window: values.window === "30" ? 30 : 7,
    metric,
    detail: report ? single(values.detail, 360) : undefined,
  };
}
