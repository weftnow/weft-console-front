import Link from "next/link";
import type { ReactNode } from "react";

import { Surface } from "@/shared/ui/surface";
import type {
  ReportDatum,
  ReportProjection,
  ReportQuery,
  ReportsPageModel,
} from "../reporting-contract";
import {
  formatCount,
  formatPercent,
  formatRatio,
  getReportingCopy,
  interpolate,
  localizeLabel,
  type ReportingLocale,
} from "../reporting-copy";
import { buildReportsHref, toggleDetailHref } from "./reporting-href";
import styles from "./reporting-page.module.css";

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function rowResponseTotal(row: ReportDatum): number | null {
  if (!row.counts || row.counts.length === 0) return null;
  if (typeof row.counts[0]?.total === "number") return row.counts[0].total;
  return row.counts.reduce((sum, item) => sum + item.count, 0);
}

function isRowInteractive(projection: ReportProjection, row: ReportDatum): boolean {
  return Boolean(row.href || (projection.details && Object.prototype.hasOwnProperty.call(projection.details, row.id)));
}

function RowWrapper({
  href,
  selected,
  ariaLabel,
  className,
  children,
}: {
  href?: string;
  selected?: boolean;
  ariaLabel?: string;
  className: string;
  children: ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link
      aria-current={selected ? "true" : undefined}
      aria-label={ariaLabel}
      className={`${className} ${styles.barRowInteractive} ${selected ? styles.barRowSelected : ""}`}
      href={href}
    >
      {children}
    </Link>
  );
}

function GoalsVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);

  return (
    <div>
      <div className={styles.legendRow}>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchPrimary}`} />
          {copy.charts.achieved}
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchSecondary}`} />
          {copy.charts.partial}
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchNeutral}`} />
          {copy.charts.unmet}
        </span>
      </div>

      <ul className={styles.barList}>
        {projection.rows.map((row) => {
          const label = localizeLabel(locale, row.label);
          const achieved = row.values[0];
          const partial = row.values[1];
          const unmet = row.values[2];
          const achievedW = clampPercent(achieved);
          const partialW = clampPercent(partial);
          const unmetW = clampPercent(unmet);
          const responseTotal = rowResponseTotal(row);
          const selected = query.detail === row.id;
          const href = isRowInteractive(projection, row)
            ? (row.href ?? toggleDetailHref(query, row.id))
            : undefined;

          return (
            <li key={row.id}>
              <RowWrapper
                ariaLabel={href ? interpolate(copy.charts.selectRowAction, { item: label }) : undefined}
                className={styles.barRow}
                href={href}
                selected={selected}
              >
                <div className={styles.barLabelWrap}>
                  <span className={styles.barLabel}>{label}</span>
                  {responseTotal !== null ? (
                    <span className={styles.barSubLabel}>
                      {interpolate(copy.charts.responsesCount, { count: formatCount(locale, responseTotal) })}
                    </span>
                  ) : null}
                </div>

                <div className={styles.barTrack}>
                  {achievedW > 0 ? (
                    <span
                      className={`${styles.barSegment} ${styles.barSegmentPrimary}`}
                      style={{ width: `${achievedW}%` }}
                    >
                      {achievedW >= 12 && typeof achieved === "number" ? formatPercent(locale, achieved) : null}
                    </span>
                  ) : null}
                  {partialW > 0 ? (
                    <span
                      className={`${styles.barSegment} ${styles.barSegmentSecondary}`}
                      style={{ width: `${partialW}%` }}
                    >
                      {partialW >= 12 && typeof partial === "number" ? formatPercent(locale, partial) : null}
                    </span>
                  ) : null}
                  {unmetW > 0 ? (
                    <span
                      className={`${styles.barSegment} ${styles.barSegmentNeutral}`}
                      style={{ width: `${unmetW}%` }}
                    >
                      {unmetW >= 12 && typeof unmet === "number" ? formatPercent(locale, unmet) : null}
                    </span>
                  ) : null}
                </div>

                <div className={styles.barValueCol}>
                  <span className={styles.barValuePrimary}>
                    {typeof achieved === "number" ? formatPercent(locale, achieved) : "—"}
                  </span>
                  <span className={styles.barValueMeta}>
                    {row.counts?.[0] ? formatRatio(locale, row.counts[0]) : copy.charts.achieved}
                  </span>
                </div>
              </RowWrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DemandVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const maxValue = Math.max(
    1,
    ...projection.rows.map((row) => (typeof row.values[0] === "number" ? row.values[0] : 0)),
  );

  return (
    <ul className={styles.barList}>
      {projection.rows.map((row, index) => {
        const label = localizeLabel(locale, row.label);
        const openCount = row.values[0];
        const width = typeof openCount === "number" && openCount > 0 ? Math.max(4, (openCount / maxValue) * 100) : 0;
        const selected = query.detail === row.id;
        const href = isRowInteractive(projection, row)
          ? (row.href ?? toggleDetailHref(query, row.id))
          : undefined;
        const isLead = selected || (!query.detail && index === 0 && typeof openCount === "number" && openCount > 0);

        return (
          <li key={row.id}>
            <RowWrapper
              ariaLabel={href ? interpolate(copy.charts.selectRowAction, { item: label }) : undefined}
              className={styles.barRow}
              href={href}
              selected={selected}
            >
              <div className={styles.barLabelWrap}>
                <span className={styles.barLabel}>{label}</span>
                {row.counts?.[0]?.total !== undefined ? (
                  <span className={styles.barSubLabel}>
                    {formatRatio(locale, row.counts[0])}
                  </span>
                ) : null}
              </div>

              <div className={styles.barTrack}>
                {width > 0 ? (
                  <span
                    className={`${styles.barSegment} ${isLead ? styles.barSegmentPrimary : styles.barSegmentGraphite}`}
                    style={{ width: `${Math.min(100, width)}%` }}
                  />
                ) : null}
              </div>

              <div className={styles.barValueCol}>
                <span className={styles.barValuePrimary}>
                  {typeof openCount === "number" ? formatCount(locale, openCount) : "—"}
                </span>
                <span className={styles.barValueMeta}>{copy.charts.openRequests}</span>
              </div>
            </RowWrapper>
          </li>
        );
      })}
    </ul>
  );
}

function FollowThroughVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);

  return (
    <ul className={styles.barList}>
      {projection.rows.map((row, index) => {
        const label = localizeLabel(locale, row.label);
        const rate = row.values[0];
        const width = clampPercent(rate);
        const selected = query.detail === row.id;
        const href = isRowInteractive(projection, row)
          ? (row.href ?? toggleDetailHref(query, row.id))
          : undefined;
        const barTone = selected || index === 0
          ? styles.barSegmentPrimary
          : index === 1
            ? styles.barSegmentSecondary
            : styles.barSegmentGraphite;

        return (
          <li key={row.id}>
            <RowWrapper
              ariaLabel={href ? interpolate(copy.charts.selectRowAction, { item: label }) : undefined}
              className={styles.barRow}
              href={href}
              selected={selected}
            >
              <div className={styles.barLabelWrap}>
                <span className={styles.barLabel}>{label}</span>
                {row.counts?.[0] ? (
                  <span className={styles.barSubLabel}>
                    {interpolate(copy.charts.baseLabel, { ratio: formatRatio(locale, row.counts[0]) })}
                  </span>
                ) : null}
              </div>

              <div className={`${styles.barTrack} ${styles.barTrackGrid}`}>
                {width > 0 ? (
                  <span
                    className={`${styles.barSegment} ${barTone}`}
                    style={{ width: `${width}%` }}
                  >
                    {width >= 16 && typeof rate === "number" ? formatPercent(locale, rate) : null}
                  </span>
                ) : null}
              </div>

              <div className={styles.barValueCol}>
                <span className={styles.barValuePrimary}>
                  {typeof rate === "number" ? formatPercent(locale, rate) : "—"}
                </span>
                {row.counts?.[0] ? (
                  <span className={styles.barValueMeta}>{formatRatio(locale, row.counts[0])}</span>
                ) : null}
              </div>
            </RowWrapper>
          </li>
        );
      })}
    </ul>
  );
}

function findBucketDetailKey(
  details: ReportProjection["details"],
  rowId: string,
  candidates: readonly string[],
): string | undefined {
  if (!details) return undefined;
  for (const suffix of candidates) {
    const key = `${rowId}:${suffix}`;
    if (Object.prototype.hasOwnProperty.call(details, key)) return key;
  }
  return undefined;
}

function CoverageVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);

  return (
    <div>
      <div className={styles.legendRow}>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchNeutral}`} />
          {copy.charts.zeroIntros}
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchSecondary}`} />
          {copy.charts.oneIntro}
        </span>
        <span className={styles.legendItem}>
          <span aria-hidden="true" className={`${styles.legendSwatch} ${styles.swatchPrimary}`} />
          {copy.charts.twoPlusIntros}
        </span>
      </div>

      <ul className={styles.barList}>
        {projection.rows.map((row) => {
          const label = localizeLabel(locale, row.label);
          const zero = row.values[0];
          const one = row.values[1];
          const twoPlus = row.values[2];
          const zeroW = clampPercent(zero);
          const oneW = clampPercent(one);
          const twoPlusW = clampPercent(twoPlus);
          const totalPeople = rowResponseTotal(row);
          const coveredRate =
            typeof one === "number" || typeof twoPlus === "number"
              ? clampPercent((one ?? 0) + (twoPlus ?? 0))
              : null;
          const zeroKey = findBucketDetailKey(projection.details, row.id, ["zero", "0"]);
          const oneKey = findBucketDetailKey(projection.details, row.id, ["one", "1"]);
          const twoPlusKey = findBucketDetailKey(projection.details, row.id, ["twoOrMore", "two_plus", "twoPlus", "2+"]);
          const hasBucketLinks = Boolean(zeroKey || oneKey || twoPlusKey);
          const selected = query.detail === row.id || Boolean(query.detail?.startsWith(`${row.id}:`));
          const href = !hasBucketLinks && isRowInteractive(projection, row)
            ? (row.href ?? toggleDetailHref(query, row.id))
            : undefined;

          const segments = [
            {
              id: "zero",
              width: zeroW,
              value: zero,
              tone: styles.barSegmentNeutral,
              detailKey: zeroKey,
              bucketLabel: copy.charts.zeroIntros,
            },
            {
              id: "one",
              width: oneW,
              value: one,
              tone: styles.barSegmentSecondary,
              detailKey: oneKey,
              bucketLabel: copy.charts.oneIntro,
            },
            {
              id: "twoPlus",
              width: twoPlusW,
              value: twoPlus,
              tone: styles.barSegmentPrimary,
              detailKey: twoPlusKey,
              bucketLabel: copy.charts.twoPlusIntros,
            },
          ];

          return (
            <li key={row.id}>
              <RowWrapper
                ariaLabel={href ? interpolate(copy.charts.selectRowAction, { item: label }) : undefined}
                className={`${styles.barRow} ${hasBucketLinks && selected ? styles.barRowSelected : ""}`}
                href={href}
                selected={selected}
              >
                <div className={styles.barLabelWrap}>
                  <span className={styles.barLabel}>{label}</span>
                  {totalPeople !== null ? (
                    <span className={styles.barSubLabel}>
                      {interpolate(copy.charts.peopleCount, { count: formatCount(locale, totalPeople) })}
                    </span>
                  ) : null}
                </div>

                <div className={styles.barTrack}>
                  {segments.map((segment) => {
                    if (segment.width <= 0) return null;
                    const text =
                      segment.width >= 12 && typeof segment.value === "number"
                        ? formatPercent(locale, segment.value)
                        : null;
                    if (hasBucketLinks && segment.detailKey) {
                      return (
                        <Link
                          aria-current={query.detail === segment.detailKey ? "true" : undefined}
                          aria-label={`${label} · ${segment.bucketLabel}: ${typeof segment.value === "number" ? formatPercent(locale, segment.value) : "—"}`}
                          className={`${styles.barSegment} ${segment.tone}`}
                          href={toggleDetailHref(query, segment.detailKey)}
                          key={segment.id}
                          style={{ width: `${segment.width}%` }}
                        >
                          {text}
                        </Link>
                      );
                    }
                    return (
                      <span
                        className={`${styles.barSegment} ${segment.tone}`}
                        key={segment.id}
                        style={{ width: `${segment.width}%` }}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>

                <div className={styles.barValueCol}>
                  <span className={styles.barValuePrimary}>
                    {coveredRate !== null ? formatPercent(locale, coveredRate) : "—"}
                  </span>
                  {row.counts && row.counts.length >= 3 ? (
                    <span className={styles.barValueMeta}>
                      {`${formatCount(locale, row.counts[0].count)} / ${formatCount(locale, row.counts[1].count)} / ${formatCount(locale, row.counts[2].count)}`}
                    </span>
                  ) : totalPeople !== null ? (
                    <span className={styles.barValueMeta}>
                      {interpolate(copy.charts.peopleCount, { count: formatCount(locale, totalPeople) })}
                    </span>
                  ) : null}
                </div>
              </RowWrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeriesVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const rows = projection.rows;

  if (rows.length <= 2) {
    return (
      <div className={styles.seriesChartWrap}>
        <div className={styles.seriesPairedGrid}>
          {rows.map((row) => {
            const label = localizeLabel(locale, row.label);
            const rate = row.values[0];
            const href = row.href ?? (isRowInteractive(projection, row) ? toggleDetailHref(query, row.id) : undefined);
            const content = (
              <>
                <span className={styles.barLabel}>{label}</span>
                <strong className={styles.reportCardFigure}>
                  {typeof rate === "number" ? formatPercent(locale, rate) : "—"}
                </strong>
                <span className={styles.barValueMeta}>
                  {row.counts?.[0] ? formatRatio(locale, row.counts[0]) : copy.status.unknownValue}
                </span>
              </>
            );
            return href ? (
              <Link className={styles.seriesPairCard} href={href} key={row.id}>
                {content}
              </Link>
            ) : (
              <div className={styles.seriesPairCard} key={row.id}>
                {content}
              </div>
            );
          })}
        </div>
        <p className={styles.seriesNote}>
          {rows.length === 2 ? copy.charts.seriesTwoEditionsNote : copy.charts.seriesSingleEditionNote}
        </p>
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padLeft = 44;
  const padRight = 28;
  const padTop = 28;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const stepX = rows.length > 1 ? plotW / (rows.length - 1) : 0;

  const points = rows.map((row, index) => {
    const value = row.values[0];
    const x = padLeft + stepX * index;
    const y = typeof value === "number" ? padTop + plotH - (clampPercent(value) / 100) * plotH : padTop + plotH;
    return {
      row,
      label: localizeLabel(locale, row.label),
      value,
      x,
      y,
      href: row.href ?? (isRowInteractive(projection, row) ? toggleDetailHref(query, row.id) : undefined),
    };
  });

  const segments: string[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (typeof a.value === "number" && typeof b.value === "number") {
      segments.push(`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
  }
  const hasGaps = points.some((point) => point.value === null);

  return (
    <div className={styles.seriesChartWrap}>
      <div className={styles.seriesSvgWrap}>
        <svg
          aria-label={copy.reports.series.visualLabel}
          className={styles.seriesSvg}
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = padTop + plotH - (tick / 100) * plotH;
            return (
              <g key={tick}>
                <line className={styles.seriesGridLine} x1={padLeft} x2={width - padRight} y1={y} y2={y} />
                <text className={styles.seriesAxisText} textAnchor="end" x={padLeft - 8} y={y + 4}>
                  {formatPercent(locale, tick)}
                </text>
              </g>
            );
          })}

          {segments.length > 0 ? <path className={styles.seriesLine} d={segments.join(" ")} /> : null}

          {points.map((point) => {
            const valueText = typeof point.value === "number" ? formatPercent(locale, point.value) : "—";
            const dot = (
              <>
                <circle
                  className={typeof point.value === "number" ? styles.seriesDot : styles.seriesDotMissing}
                  cx={point.x}
                  cy={point.y}
                  r={6}
                />
                <text
                  className={styles.seriesValueText}
                  textAnchor="middle"
                  x={point.x}
                  y={typeof point.value === "number" ? Math.max(14, point.y - 12) : padTop + plotH - 12}
                >
                  {valueText}
                </text>
                <text className={styles.seriesAxisText} textAnchor="middle" x={point.x} y={height - 12}>
                  {point.label.length > 16 ? `${point.label.slice(0, 15)}…` : point.label}
                </text>
              </>
            );

            return point.href ? (
              <a
                aria-label={`${point.label}: ${valueText}`}
                className={styles.seriesPointLink}
                href={point.href}
                key={point.row.id}
              >
                {dot}
              </a>
            ) : (
              <g key={point.row.id}>{dot}</g>
            );
          })}
        </svg>
      </div>
      {hasGaps ? <p className={styles.seriesNote}>{copy.charts.seriesGapNote}</p> : null}
    </div>
  );
}

function RelationshipsVisual({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const columns = projection.matrix ?? [];
  const maxCell = Math.max(
    1,
    ...projection.rows.flatMap((row) => row.values.map((value) => (typeof value === "number" ? value : 0))),
  );

  const mobilePairs = projection.rows.flatMap((row) => {
    const fromLabel = localizeLabel(locale, row.label);
    return columns.flatMap((col, colIndex) => {
      const value = row.values[colIndex];
      if (typeof value !== "number") return [];
      const cellId = `${row.id}:${col.id}`;
      return [{ cellId, fromLabel, toLabel: col.label, value }];
    });
  });

  function cellTone(value: number): string {
    if (value <= 0) return "";
    const ratio = value / maxCell;
    if (ratio >= 0.7) return styles.matrixCellWarmHigh;
    if (ratio >= 0.35) return styles.matrixCellWarmMid;
    return styles.matrixCellWarmLow;
  }

  return (
    <div>
      <div className={styles.matrixDesktop}>
        <table className={styles.matrixTable}>
          <caption className={styles.srOnly}>{copy.reports.relationships.visualLabel}</caption>
          <thead>
            <tr>
              <th className={styles.matrixCorner} scope="col">
                {`${copy.charts.firstEventAxis} ↓ / ${copy.charts.laterEventAxis} →`}
              </th>
              {columns.map((col) => (
                <th className={styles.matrixColHead} key={col.id} scope="col">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row) => {
              const fromLabel = localizeLabel(locale, row.label);
              return (
                <tr key={row.id}>
                  <th className={styles.matrixRowHead} scope="row">
                    {fromLabel}
                  </th>
                  {columns.map((col, colIndex) => {
                    const value = row.values[colIndex];
                    const cellId = `${row.id}:${col.id}`;
                    const selected = query.detail === cellId;
                    const hasDetail = Boolean(
                      projection.details && Object.prototype.hasOwnProperty.call(projection.details, cellId),
                    );
                    if (typeof value !== "number") {
                      return (
                        <td className={styles.matrixCell} key={col.id}>
                          <span
                            aria-label={interpolate(copy.charts.matrixEmptyCellAria, {
                              from: fromLabel,
                              to: col.label,
                            })}
                            className={styles.matrixCellEmpty}
                          >
                            —
                          </span>
                        </td>
                      );
                    }
                    const interactive = hasDetail || value > 0;
                    const aria = interpolate(copy.charts.matrixCellAria, {
                      from: fromLabel,
                      to: col.label,
                      count: formatCount(locale, value),
                    });
                    return (
                      <td className={styles.matrixCell} key={col.id}>
                        {interactive ? (
                          <Link
                            aria-current={selected ? "true" : undefined}
                            aria-label={aria}
                            className={`${styles.matrixCellLink} ${cellTone(value)} ${selected ? styles.matrixCellSelected : ""}`}
                            href={toggleDetailHref(query, cellId)}
                          >
                            {formatCount(locale, value)}
                          </Link>
                        ) : (
                          <span aria-label={aria} className={styles.matrixCellEmpty}>
                            {formatCount(locale, value)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul aria-label={copy.charts.matrixListHeading} className={styles.matrixMobileList}>
        {mobilePairs.length === 0 ? (
          <li className={styles.seriesNote}>{copy.charts.noReconnectionsInMatrix}</li>
        ) : (
          mobilePairs.map((pair) => {
            const selected = query.detail === pair.cellId;
            return (
              <li key={pair.cellId}>
                <Link
                  aria-current={selected ? "true" : undefined}
                  className={`${styles.matrixPairLink} ${selected ? styles.matrixPairLinkSelected : ""}`}
                  href={toggleDetailHref(query, pair.cellId)}
                >
                  <span>{`${pair.fromLabel} → ${pair.toLabel}`}</span>
                  <strong>{interpolate(copy.charts.pairsCount, { count: formatCount(locale, pair.value) })}</strong>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function SponsorOutcomesVisual({
  projection,
  model,
  locale,
}: {
  projection: ReportProjection;
  model: ReportsPageModel;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const { query } = model;
  const sponsorKeys = new Set(model.sponsors.map((sponsor) => sponsor.key));

  return (
    <div>
      {!query.sponsor ? (
        <p className={styles.seriesNote} style={{ marginBottom: 12 }}>
          {copy.charts.sponsorComparisonNote}
        </p>
      ) : null}

      <ul className={styles.sponsorList}>
        {projection.rows.map((row) => {
          const label = localizeLabel(locale, row.label);
          const actual = row.values[0];
          const target = row.values[1];
          const hasTarget = typeof target === "number" && target > 0;
          const pct = hasTarget && typeof actual === "number" ? (actual / target) * 100 : null;
          const selected = query.detail === row.id;
          const href = row.href
            ?? (!query.sponsor && sponsorKeys.has(row.id)
              ? buildReportsHref(query, { sponsor: row.id, detail: null })
              : isRowInteractive(projection, row)
                ? toggleDetailHref(query, row.id)
                : undefined);

          const inner = (
            <>
              <div className={styles.barLabelWrap}>
                <span className={styles.barLabel}>{label}</span>
                <span className={styles.barSubLabel}>
                  {hasTarget && typeof actual === "number"
                    ? interpolate(copy.charts.targetOf, {
                        actual: formatCount(locale, actual),
                        target: formatCount(locale, target),
                      })
                    : copy.charts.noTarget}
                </span>
              </div>

              <div>
                {hasTarget ? (
                  <div className={styles.sponsorProgressTrack}>
                    <span
                      className={styles.sponsorProgressFill}
                      style={{ width: `${clampPercent(pct)}%` }}
                    />
                  </div>
                ) : (
                  <span className={styles.sponsorNoTarget}>{copy.charts.noTarget}</span>
                )}
              </div>

              <div className={styles.barValueCol}>
                <span className={styles.barValuePrimary}>
                  {typeof actual === "number" ? formatCount(locale, actual) : "—"}
                </span>
                <span className={styles.barValueMeta}>
                  {pct !== null ? formatPercent(locale, pct) : copy.charts.actualLabel}
                </span>
              </div>
            </>
          );

          return (
            <li key={row.id}>
              {href ? (
                <Link
                  aria-current={selected ? "true" : undefined}
                  className={`${styles.sponsorRow} ${selected ? styles.sponsorRowSelected : ""}`}
                  href={href}
                >
                  {inner}
                </Link>
              ) : (
                <div className={styles.sponsorRow}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportingPrimaryVisual({
  projection,
  model,
  locale,
}: {
  projection: ReportProjection;
  model: ReportsPageModel;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);

  return (
    <Surface
      aria-label={copy.reports[projection.id].visualLabel}
      as="section"
      className={styles.visualWell}
      depth="inset"
    >
      {projection.id === "goals" ? (
        <GoalsVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "demand" ? (
        <DemandVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "follow-through" ? (
        <FollowThroughVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "coverage" ? (
        <CoverageVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "series" ? (
        <SeriesVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "relationships" ? (
        <RelationshipsVisual locale={locale} projection={projection} query={model.query} />
      ) : null}
      {projection.id === "sponsor-outcomes" ? (
        <SponsorOutcomesVisual locale={locale} model={model} projection={projection} />
      ) : null}
    </Surface>
  );
}
