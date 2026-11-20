"use client";

import Form from "next/form";
import Link from "next/link";
import type { ChangeEvent } from "react";

import { ChevronDownIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import {
  reportGroups,
  type ReportId,
  type ReportProjection,
  type ReportQuery,
  type ReportsPageModel,
  type ReportView,
  type TrendMetric,
} from "../reporting-contract";
import {
  formatShortDate,
  getReportingCopy,
  getTrendMetricLabel,
  getViewLabel,
  type ReportingLocale,
} from "../reporting-copy";
import {
  buildReportsHref,
  getActiveReportId,
  REPORTS_BASE_PATH,
  switchViewHref,
} from "./reporting-href";
import styles from "./reporting-page.module.css";

const VIEWS: readonly ReportView[] = ["event", "across", "sponsors"];
const TREND_METRICS: readonly TrendMetric[] = ["goals", "coverage", "follow-through"];
const WINDOWS: readonly (7 | 30)[] = [7, 30];

function submitParentForm(event: ChangeEvent<HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}

export function ReportingScopeBar({
  model,
  locale,
}: {
  model: ReportsPageModel;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const { query } = model;
  const activeReport = getActiveReportId(query);
  const effectiveEventId = model.selectedEventId ?? query.eventId ?? "";

  return (
    <Surface
      aria-label={copy.scope.regionLabel}
      as="section"
      className={styles.scopeBar}
      depth="raised"
    >
      <nav aria-label={copy.viewsLabel} className={styles.viewNav}>
        {VIEWS.map((view) => {
          const active = query.view === view;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`${styles.viewTab} ${active ? styles.viewTabActive : ""}`}
              href={switchViewHref(query, view)}
              key={view}
            >
              {getViewLabel(locale, view)}
            </Link>
          );
        })}
      </nav>

      <Form action={REPORTS_BASE_PATH} className={styles.scopeForm}>
        <input name="view" type="hidden" value={query.view} />
        <input name="report" type="hidden" value={activeReport} />
        <input name="window" type="hidden" value={String(query.window)} />
        <input name="metric" type="hidden" value={query.metric} />
        {query.view !== "across" && query.series ? (
          <input name="series" type="hidden" value={query.series} />
        ) : null}
        {query.view !== "across" && query.from ? (
          <input name="from" type="hidden" value={query.from} />
        ) : null}
        {query.view !== "across" && query.to ? (
          <input name="to" type="hidden" value={query.to} />
        ) : null}
        {query.view === "across" && effectiveEventId ? (
          <input name="eventId" type="hidden" value={effectiveEventId} />
        ) : null}
        {query.view === "event" && query.sponsor ? (
          <input name="sponsor" type="hidden" value={query.sponsor} />
        ) : null}
        {query.view === "across" && query.sponsor ? (
          <input name="sponsor" type="hidden" value={query.sponsor} />
        ) : null}

        {query.view === "event" ? (
          <div className={styles.scopeField}>
            <label className={styles.scopeFieldLabel} htmlFor="reporting-event-select">
              {copy.scope.eventLabel}
            </label>
            <div className={styles.selectWrap}>
              <select
                className={styles.selectControl}
                defaultValue={effectiveEventId}
                id="reporting-event-select"
                key={effectiveEventId || "none"}
                name="eventId"
                onChange={submitParentForm}
              >
                {model.events.length === 0 ? (
                  <option value="">{copy.scope.allEventsPlaceholder}</option>
                ) : null}
                {model.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {`${event.name} · ${formatShortDate(locale, event.endsAt)}`}
                  </option>
                ))}
              </select>
              <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} height="14" width="14" />
            </div>
          </div>
        ) : null}

        {query.view === "across" ? (
          <>
            <div className={styles.scopeField}>
              <label className={styles.scopeFieldLabel} htmlFor="reporting-series-select">
                {copy.scope.seriesLabel}
              </label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.selectControl}
                  defaultValue={query.series ?? ""}
                  id="reporting-series-select"
                  key={query.series ?? "all-series"}
                  name="series"
                  onChange={submitParentForm}
                >
                  <option value="">{copy.scope.allSeriesOption}</option>
                  {model.series.map((seriesItem) => (
                    <option key={seriesItem.key} value={seriesItem.key}>
                      {seriesItem.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} height="14" width="14" />
              </div>
            </div>

            <div className={styles.scopeField}>
              <label className={styles.scopeFieldLabel} htmlFor="reporting-from-date">
                {copy.scope.fromLabel}
              </label>
              <input
                className={styles.dateControl}
                defaultValue={query.from ?? ""}
                id="reporting-from-date"
                key={query.from ?? "from-empty"}
                name="from"
                type="date"
              />
            </div>

            <div className={styles.scopeField}>
              <label className={styles.scopeFieldLabel} htmlFor="reporting-to-date">
                {copy.scope.toLabel}
              </label>
              <input
                className={styles.dateControl}
                defaultValue={query.to ?? ""}
                id="reporting-to-date"
                key={query.to ?? "to-empty"}
                name="to"
                type="date"
              />
            </div>
          </>
        ) : null}

        {query.view === "sponsors" ? (
          <>
            <div className={styles.scopeField}>
              <label className={styles.scopeFieldLabel} htmlFor="reporting-sponsor-event-select">
                {copy.scope.eventLabel}
              </label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.selectControl}
                  defaultValue={effectiveEventId}
                  id="reporting-sponsor-event-select"
                  key={effectiveEventId || "sponsor-event-none"}
                  name="eventId"
                  onChange={submitParentForm}
                >
                  {model.events.length === 0 ? (
                    <option value="">{copy.scope.allEventsPlaceholder}</option>
                  ) : null}
                  {model.events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {`${event.name} · ${formatShortDate(locale, event.endsAt)}`}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} height="14" width="14" />
              </div>
            </div>

            <div className={styles.scopeField}>
              <label className={styles.scopeFieldLabel} htmlFor="reporting-sponsor-select">
                {copy.scope.sponsorLabel}
              </label>
              <div className={styles.selectWrap}>
                <select
                  className={styles.selectControl}
                  defaultValue={query.sponsor ?? ""}
                  id="reporting-sponsor-select"
                  key={query.sponsor ?? "all-sponsors"}
                  name="sponsor"
                  onChange={submitParentForm}
                >
                  <option value="">{copy.scope.allSponsorsOption}</option>
                  {model.sponsors.map((sponsor) => (
                    <option key={sponsor.key} value={sponsor.key}>
                      {sponsor.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} height="14" width="14" />
              </div>
            </div>
          </>
        ) : null}

        <button className={`tactile-button tactile-button--neutral ${styles.applyButton}`} type="submit">
          {copy.scope.apply}
        </button>
      </Form>
    </Surface>
  );
}

export function ReportingInReportControls({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const options = projection.options ?? [];
  const hasAllOption = options.some((option) => option.key === "" || option.key === "all");
  const showWindow = projection.id === "follow-through" || (projection.id === "series" && query.metric === "follow-through");
  const showMetric = projection.id === "series";

  if (options.length === 0 && !showWindow && !showMetric) {
    return null;
  }

  return (
    <div className={styles.reportControls}>
      {showMetric ? (
        <div aria-label={copy.scope.metricLabel} className={styles.segmentedGroup} role="group">
          {TREND_METRICS.map((metric) => {
            const active = query.metric === metric;
            return (
              <Link
                aria-current={active ? "true" : undefined}
                className={`${styles.segmentedItem} ${active ? styles.segmentedItemActive : ""}`}
                href={buildReportsHref(query, { metric, detail: null })}
                key={metric}
              >
                {getTrendMetricLabel(locale, metric)}
              </Link>
            );
          })}
        </div>
      ) : null}

      {showWindow ? (
        <div aria-label={copy.scope.windowLabel} className={styles.segmentedGroup} role="group">
          {WINDOWS.map((windowDays) => {
            const active = query.window === windowDays;
            return (
              <Link
                aria-current={active ? "true" : undefined}
                className={`${styles.segmentedItem} ${active ? styles.segmentedItemActive : ""}`}
                href={buildReportsHref(query, { window: windowDays, detail: null })}
                key={windowDays}
              >
                {windowDays === 7 ? copy.scope.window7 : copy.scope.window30}
              </Link>
            );
          })}
        </div>
      ) : null}

      {options.length > 0 && options.length <= 6 ? (
        <div aria-label={copy.scope.segmentLabel} className={styles.segmentedGroup} role="group">
          {!hasAllOption ? (
            <Link
              aria-current={!query.segment ? "true" : undefined}
              className={`${styles.segmentedItem} ${!query.segment ? styles.segmentedItemActive : ""}`}
              href={buildReportsHref(query, { segment: null, detail: null })}
            >
              {copy.scope.allSegmentsOption}
            </Link>
          ) : null}
          {options.map((option) => {
            const isAllKey = option.key === "" || option.key === "all";
            const active = isAllKey ? !query.segment || query.segment === option.key : query.segment === option.key;
            return (
              <Link
                aria-current={active ? "true" : undefined}
                className={`${styles.segmentedItem} ${active ? styles.segmentedItemActive : ""}`}
                href={buildReportsHref(query, { segment: isAllKey ? null : option.key, detail: null })}
                key={option.key}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {options.length > 6 ? (
        <Form action={REPORTS_BASE_PATH} className={styles.scopeForm}>
          <input name="view" type="hidden" value={query.view} />
          <input name="report" type="hidden" value={getActiveReportId(query)} />
          {query.eventId ? <input name="eventId" type="hidden" value={query.eventId} /> : null}
          {query.series ? <input name="series" type="hidden" value={query.series} /> : null}
          {query.from ? <input name="from" type="hidden" value={query.from} /> : null}
          {query.to ? <input name="to" type="hidden" value={query.to} /> : null}
          {query.sponsor ? <input name="sponsor" type="hidden" value={query.sponsor} /> : null}
          <input name="window" type="hidden" value={String(query.window)} />
          <input name="metric" type="hidden" value={query.metric} />
          <div className={styles.scopeField}>
            <label className={styles.srOnly} htmlFor="reporting-segment-select">
              {copy.scope.segmentLabel}
            </label>
            <div className={styles.selectWrap}>
              <select
                className={styles.selectControl}
                defaultValue={query.segment ?? ""}
                id="reporting-segment-select"
                key={query.segment ?? "all-segments"}
                name="segment"
                onChange={submitParentForm}
              >
                {!hasAllOption ? <option value="">{copy.scope.allSegmentsOption}</option> : null}
                {options.map((option) => (
                  <option key={option.key} value={option.key === "all" ? "" : option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon aria-hidden="true" className={styles.selectChevron} height="14" width="14" />
            </div>
          </div>
        </Form>
      ) : null}
    </div>
  );
}

export function getViewReportIds(view: ReportView): readonly ReportId[] {
  return reportGroups[view];
}
