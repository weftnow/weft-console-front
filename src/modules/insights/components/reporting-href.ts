import {
  reportGroups,
  type ReportId,
  type ReportQuery,
  type ReportView,
  type TrendMetric,
} from "../reporting-contract";

export const REPORTS_BASE_PATH = "/outcomes/reports";
export const OUTCOMES_BASE_PATH = "/outcomes";
export const EVIDENCE_BASE_PATH = "/outcomes/reports/evidence";

export type ReportQueryPatch = Partial<{
  view: ReportView;
  report: ReportId | null;
  eventId: string | null;
  series: string | null;
  from: string | null;
  to: string | null;
  sponsor: string | null;
  segment: string | null;
  window: 7 | 30;
  metric: TrendMetric;
  detail: string | null;
}>;

export function getActiveReportId(query: ReportQuery): ReportId {
  const allowed = reportGroups[query.view] as readonly ReportId[];
  if (query.report && allowed.includes(query.report)) return query.report;
  return allowed[0];
}

export function buildReportsHref(current: ReportQuery, patch: ReportQueryPatch = {}): string {
  const view = patch.view ?? current.view;
  const merged = {
    view,
    eventId: patch.eventId !== undefined ? patch.eventId : current.eventId,
    report: patch.report !== undefined ? patch.report : current.report,
    series: patch.series !== undefined ? patch.series : current.series,
    from: patch.from !== undefined ? patch.from : current.from,
    to: patch.to !== undefined ? patch.to : current.to,
    sponsor: patch.sponsor !== undefined ? patch.sponsor : current.sponsor,
    segment: patch.segment !== undefined ? patch.segment : current.segment,
    window: patch.window ?? current.window,
    metric: patch.metric ?? current.metric,
    detail: patch.detail !== undefined ? patch.detail : current.detail,
  };

  const params = new URLSearchParams();
  params.set("view", merged.view);
  if (merged.eventId) params.set("eventId", merged.eventId);
  if (merged.report) params.set("report", merged.report);
  if (merged.series) params.set("series", merged.series);
  if (merged.from) params.set("from", merged.from);
  if (merged.to) params.set("to", merged.to);
  if (merged.sponsor) params.set("sponsor", merged.sponsor);
  if (merged.segment) params.set("segment", merged.segment);
  if (merged.window === 7 || merged.window === 30) params.set("window", String(merged.window));
  if (merged.metric) params.set("metric", merged.metric);
  if (merged.detail) params.set("detail", merged.detail);

  return `${REPORTS_BASE_PATH}?${params.toString()}`;
}

export function switchViewHref(current: ReportQuery, view: ReportView): string {
  const nextReport = reportGroups[view][0];
  return buildReportsHref(current, {
    view,
    report: nextReport,
    segment: null,
    detail: null,
  });
}

export function selectReportHref(current: ReportQuery, report: ReportId): string {
  return buildReportsHref(current, {
    report,
    detail: null,
  });
}

export function toggleDetailHref(current: ReportQuery, detailId: string): string {
  return buildReportsHref(current, {
    detail: current.detail === detailId ? null : detailId,
  });
}

export function recordedMeetingsHref(eventId?: string | null): string {
  return eventId ? `${OUTCOMES_BASE_PATH}?eventId=${encodeURIComponent(eventId)}` : OUTCOMES_BASE_PATH;
}

export function evidenceEntryHref(eventId?: string | null): string {
  return eventId ? `${EVIDENCE_BASE_PATH}?eventId=${encodeURIComponent(eventId)}` : EVIDENCE_BASE_PATH;
}
