import Link from "next/link";

import { EmptyState } from "@/shared/ui/empty-state";
import {
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  OutcomesIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import {
  reportGroups,
  type ReportId,
  type ReportProjection,
  type ReportsPageModel,
} from "../reporting-contract";
import {
  computeRateFromCount,
  formatCount,
  formatDeltaPoints,
  formatPercent,
  formatRatio,
  getReportingCopy,
  getTrendMetricLabel,
  interpolate,
  type ReportingLocale,
} from "../reporting-copy";
import { ReportingPrimaryVisual } from "./reporting-charts";
import {
  ReportingInReportControls,
  ReportingScopeBar,
} from "./reporting-controls";
import {
  evidenceEntryHref,
  getActiveReportId,
  recordedMeetingsHref,
  selectReportHref,
} from "./reporting-href";
import styles from "./reporting-page.module.css";
import { ReportingEvidenceTables } from "./reporting-table";

function isMeasuredZero(projection: ReportProjection): boolean {
  if (projection.status !== "ready") return false;
  if (!projection.measure) return false;
  if (projection.measure.count !== 0) return false;
  if (projection.id === "demand") return true;
  if (typeof projection.measure.total === "number") return projection.measure.total > 0;
  return projection.rows.length > 0;
}

function formatHeadlineFigure(
  projection: ReportProjection,
  locale: ReportingLocale,
): { text: string; ariaLabel?: string; isMuted: boolean } {
  const copy = getReportingCopy(locale);

  if (projection.status === "unavailable") {
    return { text: "—", ariaLabel: copy.status.unknownValue, isMuted: true };
  }

  if (projection.id === "series" && typeof projection.delta === "number") {
    const formatted = formatDeltaPoints(locale, projection.delta);
    return { text: formatted.text, ariaLabel: formatted.ariaLabel, isMuted: false };
  }

  if (!projection.measure) {
    return { text: "—", ariaLabel: copy.status.unknownValue, isMuted: true };
  }

  if (projection.id === "demand") {
    return { text: formatCount(locale, projection.measure.count), isMuted: false };
  }

  const rate = computeRateFromCount(projection.measure);
  if (rate !== null) {
    return { text: formatPercent(locale, rate), isMuted: false };
  }
  return { text: formatCount(locale, projection.measure.count), isMuted: false };
}

function buildViewFinding(
  projections: ReportProjection[],
  selectedProjection: ReportProjection,
  locale: ReportingLocale,
): string {
  const copy = getReportingCopy(locale);
  const candidate =
    selectedProjection.status !== "unavailable"
      ? selectedProjection
      : (projections.find((item) => item.status === "ready")
        ?? projections.find((item) => item.status === "collecting")
        ?? selectedProjection);

  const reportName = copy.reports[candidate.id].shortTitle;

  if (candidate.status === "unavailable") {
    return copy.finding.unavailable;
  }

  if (candidate.status === "collecting") {
    return interpolate(copy.finding.collecting, { report: reportName });
  }

  const ratio = candidate.measure ? formatRatio(locale, candidate.measure) : copy.status.ready;

  if (isMeasuredZero(candidate)) {
    return interpolate(copy.finding.measuredZero, { report: reportName, ratio });
  }

  if (candidate.id === "series" && typeof candidate.delta === "number") {
    return interpolate(copy.finding.readyDelta, {
      report: reportName,
      delta: formatDeltaPoints(locale, candidate.delta).text,
      ratio,
    });
  }

  const headline = formatHeadlineFigure(candidate, locale).text;
  return interpolate(copy.finding.readyMeasure, {
    report: reportName,
    headline,
    ratio,
  });
}

function StatusBadge({
  projection,
  locale,
}: {
  projection: ReportProjection;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  if (projection.status === "collecting") {
    return <span className={`${styles.statusPill} ${styles.statusCollecting}`}>{copy.status.collecting}</span>;
  }
  if (projection.status === "unavailable") {
    return <span className={`${styles.statusPill} ${styles.statusUnavailable}`}>{copy.status.unavailable}</span>;
  }
  if (isMeasuredZero(projection)) {
    return <span className={`${styles.statusPill} ${styles.statusZero}`}>{copy.status.measuredZero}</span>;
  }
  return <span className={`${styles.statusPill} ${styles.statusReady}`}>{copy.status.ready}</span>;
}

export function ReportingPage({
  model,
  locale,
}: {
  model: ReportsPageModel;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const { query } = model;
  const activeEventId = model.selectedEventId ?? query.eventId;
  const groupIds = reportGroups[query.view] as readonly ReportId[];
  const selectedReportId = getActiveReportId(query);

  const projectionMap = new Map(model.projections.map((item) => [item.id, item]));
  const viewProjections: ReportProjection[] = groupIds.map(
    (id) =>
      projectionMap.get(id) ?? {
        id,
        status: "unavailable",
        columns: [],
        rows: [],
      },
  );
  const selectedProjection =
    viewProjections.find((item) => item.id === selectedReportId) ?? viewProjections[0];

  const reportCopy = copy.reports[selectedProjection.id];
  const headline = formatHeadlineFigure(selectedProjection, locale);
  const findingText = buildViewFinding(viewProjections, selectedProjection, locale);
  const measuredZero = isMeasuredZero(selectedProjection);
  const denominatorNote = interpolate(reportCopy.denominatorNote, {
    window: query.window,
    metric: getTrendMetricLabel(locale, query.metric),
  });

  const needsEventAndEmpty =
    model.events.length === 0
    && (query.view === "event" || query.view === "sponsors")
    && selectedProjection.status === "unavailable";

  const reportGridClass =
    viewProjections.length >= 4
      ? styles.reportGridEvent
      : viewProjections.length === 2
        ? styles.reportGridAcross
        : styles.reportGridSingle;

  return (
    <main className={`dashboard-main ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>
            {`${copy.kicker} · ${model.organizationName}`}
          </p>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>

        <div className={styles.headerLinks}>
          <Link
            className={`tactile-button tactile-button--neutral ${styles.headerLink}`}
            href={recordedMeetingsHref(activeEventId)}
          >
            <OutcomesIcon height="15" width="15" />
            <span>{copy.recordedMeetingsLink}</span>
          </Link>
          {activeEventId && (
            <Link
              className={`tactile-button tactile-button--neutral ${styles.headerLink}`}
              href={evidenceEntryHref(activeEventId)}
            >
              <DocumentIcon height="15" width="15" />
              <span>{copy.manageEvidenceLink}</span>
            </Link>
          )}
        </div>
      </header>

      <div className={styles.stack}>
        <ReportingScopeBar locale={locale} model={model} />

        {needsEventAndEmpty ? (
          <Surface as="section" className={styles.reportPanel} depth="raised">
            <EmptyState
              action={
                <div className={styles.emptyActions}>
                  <Link className="tactile-button tactile-button--primary" href="/events/new">
                    {copy.empty.createEvent}
                  </Link>
                </div>
              }
              description={copy.empty.noEventsDescription}
              icon={CalendarIcon}
              title={copy.empty.noEventsTitle}
            />
          </Surface>
        ) : (
          <>
            <Surface as="section" className={styles.findingCallout} depth="inset">
              <OutcomesIcon className={styles.findingIcon} height="18" width="18" />
              <div className={styles.findingBody}>
                <span className={styles.findingLabel}>{copy.finding.label}</span>
                <p className={styles.findingText}>{findingText}</p>
              </div>
            </Surface>

            {viewProjections.length > 1 ? (
              <nav aria-label={copy.reportListLabel} className={`${styles.reportGrid} ${reportGridClass}`}>
                {viewProjections.map((projection) => {
                  const selected = projection.id === selectedProjection.id;
                  const cardHeadline = formatHeadlineFigure(projection, locale);
                  return (
                    <Link
                      aria-current={selected ? "page" : undefined}
                      className={`${styles.reportCard} ${selected ? styles.reportCardSelected : ""}`}
                      href={selectReportHref(query, projection.id)}
                      key={projection.id}
                    >
                      <div className={styles.reportCardHead}>
                        <span className={styles.reportCardTitle}>
                          {copy.reports[projection.id].shortTitle}
                        </span>
                        <StatusBadge locale={locale} projection={projection} />
                      </div>

                      <div>
                        <div
                          aria-label={cardHeadline.ariaLabel}
                          className={`${styles.reportCardFigure} ${cardHeadline.isMuted ? styles.reportCardFigureMuted : ""}`}
                        >
                          {cardHeadline.text}
                        </div>
                        <div className={styles.reportCardMeta}>
                          {projection.measure
                            ? formatRatio(locale, projection.measure)
                            : copy.status[projection.status]}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            ) : null}

            <Surface
              aria-labelledby="reporting-active-heading"
              as="section"
              className={styles.reportPanel}
              depth="raised"
            >
              <div className={styles.reportHeader}>
                <div className={styles.reportHeaderCopy}>
                  <div className={styles.reportTitleRow}>
                    <h2 className={styles.reportTitle} id="reporting-active-heading">
                      {reportCopy.title}
                    </h2>
                    <StatusBadge locale={locale} projection={selectedProjection} />
                  </div>
                  <p className={styles.reportQuestion}>{reportCopy.question}</p>
                </div>

                <ReportingInReportControls
                  locale={locale}
                  projection={selectedProjection}
                  query={query}
                />
              </div>

              <div className={styles.leadBlock}>
                <div className={styles.leadPrimary}>
                  <span className={styles.leadLabel}>{reportCopy.leadLabel}</span>
                  <div className={styles.leadFigureRow}>
                    <strong aria-label={headline.ariaLabel} className={styles.leadFigure}>
                      {headline.text}
                    </strong>
                    {selectedProjection.measure ? (
                      <span className={styles.leadRatio}>
                        {formatRatio(locale, selectedProjection.measure)}
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.leadExplanation}>{denominatorNote}</p>
                </div>

                {(selectedProjection.responseCoverage || selectedProjection.basis) ? (
                  <div className={styles.leadMeta}>
                    {selectedProjection.responseCoverage ? (
                      <div className={styles.metaBadge}>
                        <span className={styles.metaBadgeLabel}>{reportCopy.coverageLabel}</span>
                        <span className={styles.metaBadgeValue}>
                          {typeof selectedProjection.responseCoverage.total === "number"
                            ? interpolate(reportCopy.coverageDetail, {
                                count: formatCount(locale, selectedProjection.responseCoverage.count),
                                total: formatCount(locale, selectedProjection.responseCoverage.total),
                              })
                            : formatCount(locale, selectedProjection.responseCoverage.count)}
                        </span>
                      </div>
                    ) : null}

                    {selectedProjection.basis ? (
                      <div
                        className={`${styles.metaBadge} ${selectedProjection.basis === "roster" ? styles.metaBadgeRoster : ""}`}
                      >
                        <span className={styles.metaBadgeLabel}>{copy.basis.label}</span>
                        <span className={styles.metaBadgeValue}>
                          {selectedProjection.basis === "roster"
                            ? copy.basis.roster
                            : copy.basis.attendance}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {selectedProjection.basis ? (
                <p className={styles.seriesNote}>
                  {selectedProjection.basis === "roster" ? copy.basis.rosterNote : copy.basis.attendanceNote}
                </p>
              ) : null}

              {selectedProjection.status === "collecting" ? (
                <div className={`${styles.noticeBanner} ${styles.noticeBannerCollecting}`}>
                  <ClockIcon height="16" width="16" />
                  <span>
                    {interpolate(reportCopy.collectingNote, { window: query.window })}
                  </span>
                </div>
              ) : null}

              {measuredZero ? (
                <div className={`${styles.noticeBanner} ${styles.noticeBannerZero}`}>
                  <OutcomesIcon height="16" width="16" />
                  <span>{reportCopy.measuredZeroNote}</span>
                </div>
              ) : null}

              {selectedProjection.status === "unavailable" ? (
                <div className={styles.emptyPanel}>
                  <EmptyState
                    action={
                      <div className={styles.emptyActions}>
                        {activeEventId && <Link
                          className="tactile-button tactile-button--primary"
                          href={evidenceEntryHref(activeEventId)}
                        >
                          {copy.manageEvidenceLink}
                        </Link>}
                        <Link
                          className="tactile-button tactile-button--neutral"
                          href={recordedMeetingsHref(activeEventId)}
                        >
                          {copy.recordedMeetingsLink}
                        </Link>
                      </div>
                    }
                    description={reportCopy.unavailableDescription}
                    icon={OutcomesIcon}
                    size="panel"
                    title={`${reportCopy.title} · ${copy.status.unavailable}`}
                  />
                </div>
              ) : selectedProjection.rows.length > 0 ? (
                <>
                  <ReportingPrimaryVisual
                    locale={locale}
                    model={model}
                    projection={selectedProjection}
                  />
                  <ReportingEvidenceTables
                    locale={locale}
                    model={model}
                    projection={selectedProjection}
                  />
                </>
              ) : selectedProjection.breakdown || query.detail ? (
                <ReportingEvidenceTables
                  locale={locale}
                  model={model}
                  projection={selectedProjection}
                />
              ) : selectedProjection.status !== "collecting" ? (
                <div className={`${styles.noticeBanner} ${styles.noticeBannerZero}`}>
                  <ClockIcon height="16" width="16" />
                  <span>{copy.table.noRows}</span>
                </div>
              ) : null}
            </Surface>
          </>
        )}
      </div>
    </main>
  );
}
