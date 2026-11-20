import Link from "next/link";

import { ChevronRightIcon, CloseIcon } from "@/shared/ui/icons";
import type {
  ReportBreakdown,
  ReportDatum,
  ReportProjection,
  ReportQuery,
  ReportsPageModel,
} from "../reporting-contract";
import {
  formatCount,
  formatPercent,
  getReportingCopy,
  interpolate,
  localizeKey,
  localizeLabel,
  type ReportingLocale,
} from "../reporting-copy";
import { buildReportsHref, toggleDetailHref } from "./reporting-href";
import styles from "./reporting-page.module.css";

function formatDatumCell(
  projection: ReportProjection,
  row: ReportDatum,
  valueIndex: number,
  locale: ReportingLocale,
): string {
  const value = row.values[valueIndex];
  if (value === null || value === undefined) {
    if (projection.id === "sponsor-outcomes" && valueIndex === 1) {
      return getReportingCopy(locale).charts.noTarget;
    }
    return "—";
  }

  if (projection.id === "demand" || projection.id === "relationships" || projection.id === "sponsor-outcomes") {
    return formatCount(locale, value);
  }
  return formatPercent(locale, value);
}

function defaultColumnsForReport(projection: ReportProjection, locale: ReportingLocale): string[] {
  const copy = getReportingCopy(locale);
  if (projection.columns.length > 0) {
    return projection.columns.map((column) => localizeKey(locale, column));
  }
  switch (projection.id) {
    case "goals":
      return [copy.table.itemColumn, copy.charts.achieved, copy.charts.partial, copy.charts.unmet];
    case "demand":
      return [copy.table.itemColumn, copy.charts.openRequests];
    case "follow-through":
      return [copy.table.itemColumn, copy.table.valueColumn];
    case "coverage":
      return [copy.table.itemColumn, copy.charts.zeroIntros, copy.charts.oneIntro, copy.charts.twoPlusIntros];
    case "series":
      return [copy.table.itemColumn, copy.table.valueColumn];
    case "relationships":
      return [copy.table.firstEventColumn, copy.table.laterEventColumn, copy.table.pairsColumn];
    case "sponsor-outcomes":
      return [copy.table.itemColumn, copy.charts.actualLabel, copy.charts.targetLabel];
  }
}

function resolveDetailSubject(
  projection: ReportProjection,
  detailId: string,
  locale: ReportingLocale,
): string {
  if (projection.id === "relationships" && detailId.includes(":")) {
    const [rowId, colId] = detailId.split(":");
    const row = projection.rows.find((candidate) => candidate.id === rowId);
    const col = projection.matrix?.find((candidate) => candidate.id === colId);
    const fromLabel = row ? localizeLabel(locale, row.label) : rowId;
    const toLabel = col ? col.label : colId;
    return `${fromLabel} → ${toLabel}`;
  }

  const directRow = projection.rows.find((candidate) => candidate.id === detailId);
  if (directRow) return localizeLabel(locale, directRow.label);

  if (detailId.includes(":")) {
    const separator = detailId.lastIndexOf(":");
    const rowId = detailId.slice(0, separator);
    const bucketKey = detailId.slice(separator + 1);
    const row = projection.rows.find((candidate) => candidate.id === rowId);
    if (row) {
      return `${localizeLabel(locale, row.label)} · ${localizeKey(locale, bucketKey)}`;
    }
  }

  return localizeKey(locale, detailId);
}

function BreakdownTable({
  breakdown,
  locale,
  caption,
}: {
  breakdown: ReportBreakdown;
  locale: ReportingLocale;
  caption: string;
}) {
  const copy = getReportingCopy(locale);
  const localizedCols = breakdown.columns.map((column) => localizeKey(locale, column));

  if (breakdown.rows.length === 0) {
    return <p className={styles.seriesNote}>{copy.table.noRows}</p>;
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            {localizedCols.map((colLabel, index) => (
              <th key={`${colLabel}-${index}`} scope="col">
                {colLabel}
              </th>
            ))}
            {breakdown.rows.some((row) => Boolean(row.href)) ? (
              <th className={styles.actionCell} scope="col">
                <span className={styles.srOnly}>{copy.table.actionColumn}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {breakdown.rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, cellIndex) => (
                <td
                  data-label={localizedCols[cellIndex] ?? copy.table.valueColumn}
                  key={`${row.id}-${cellIndex}`}
                >
                  {localizeLabel(locale, cell)}
                </td>
              ))}
              {breakdown.rows.some((candidate) => Boolean(candidate.href)) ? (
                <td className={styles.actionCell}>
                  {row.href ? (
                    <Link className={styles.rowLink} href={row.href}>
                      <span>{copy.table.openLink}</span>
                      <ChevronRightIcon height="14" width="14" />
                    </Link>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelationshipsPairTable({
  projection,
  query,
  locale,
}: {
  projection: ReportProjection;
  query: ReportQuery;
  locale: ReportingLocale;
}) {
  const copy = getReportingCopy(locale);
  const matrixCols = projection.matrix ?? [];
  const pairs = projection.rows.flatMap((row) => {
    const fromLabel = localizeLabel(locale, row.label);
    return matrixCols.flatMap((col, colIndex) => {
      const value = row.values[colIndex];
      if (typeof value !== "number") return [];
      const cellId = `${row.id}:${col.id}`;
      return [{ cellId, fromLabel, toLabel: col.label, value }];
    });
  });

  return (
    <div className={styles.tableBlock}>
      <div className={styles.tableBlockHead}>
        <h3 className={styles.tableBlockTitle}>{copy.table.evidenceHeading}</h3>
        <span className={styles.tableBlockMeta}>
          {interpolate(copy.table.rowCount, { count: formatCount(locale, pairs.length) })}
        </span>
      </div>

      {pairs.length === 0 ? (
        <p className={styles.seriesNote}>{copy.charts.noReconnectionsInMatrix}</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <caption className={styles.srOnly}>{copy.reports.relationships.tableCaption}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.table.firstEventColumn}</th>
                <th scope="col">{copy.table.laterEventColumn}</th>
                <th className={styles.numericCell} scope="col">{copy.table.pairsColumn}</th>
                <th className={styles.actionCell} scope="col">{copy.table.actionColumn}</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair) => {
                const selected = query.detail === pair.cellId;
                return (
                  <tr
                    className={selected ? styles.dataTableRowSelected : undefined}
                    key={pair.cellId}
                  >
                    <td data-label={copy.table.firstEventColumn}>{pair.fromLabel}</td>
                    <td data-label={copy.table.laterEventColumn}>{pair.toLabel}</td>
                    <td className={styles.numericCell} data-label={copy.table.pairsColumn}>
                      {formatCount(locale, pair.value)}
                    </td>
                    <td className={styles.actionCell} data-label={copy.table.actionColumn}>
                      <Link
                        aria-current={selected ? "true" : undefined}
                        className={styles.rowLink}
                        href={toggleDetailHref(query, pair.cellId)}
                      >
                        <span>{selected ? copy.table.selected : copy.table.selectForBreakdown}</span>
                        <ChevronRightIcon height="14" width="14" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ReportingEvidenceTables({
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
  const selectedDetailId = query.detail;
  const activeDetail =
    selectedDetailId && projection.details && Object.prototype.hasOwnProperty.call(projection.details, selectedDetailId)
      ? projection.details[selectedDetailId]
      : null;

  const columns = defaultColumnsForReport(projection, locale);
  const valueCount = Math.max(
    projection.rows[0]?.values.length ?? 0,
    Math.max(0, columns.length - 1),
  );
  const hasRowCounts = projection.rows.some((row) => Boolean(row.counts && row.counts.length > 0));
  const hasAnyAction = projection.rows.some((row) =>
    Boolean(
      row.href
      || (projection.id === "sponsor-outcomes" && !query.sponsor && sponsorKeys.has(row.id))
      || (projection.details && Object.prototype.hasOwnProperty.call(projection.details, row.id)),
    ),
  );

  return (
    <section className={styles.tablesSection}>
      {projection.id === "relationships" ? (
        <RelationshipsPairTable locale={locale} projection={projection} query={query} />
      ) : (
        <div className={styles.tableBlock}>
          <div className={styles.tableBlockHead}>
            <h3 className={styles.tableBlockTitle}>{copy.table.evidenceHeading}</h3>
            <span className={styles.tableBlockMeta}>
              {interpolate(copy.table.rowCount, { count: formatCount(locale, projection.rows.length) })}
            </span>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <caption className={styles.srOnly}>{copy.reports[projection.id].tableCaption}</caption>
              <thead>
                <tr>
                  <th scope="col">{columns[0] ?? copy.table.itemColumn}</th>
                  {Array.from({ length: valueCount }).map((_, idx) => (
                    <th className={styles.numericCell} key={idx} scope="col">
                      {columns[idx + 1] ?? copy.table.valueColumn}
                    </th>
                  ))}
                  {hasRowCounts ? (
                    <th className={styles.numericCell} scope="col">{copy.table.ratioColumn}</th>
                  ) : null}
                  {hasAnyAction ? (
                    <th className={styles.actionCell} scope="col">{copy.table.actionColumn}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {projection.rows.map((row) => {
                  const label = localizeLabel(locale, row.label);
                  const selected = selectedDetailId === row.id;
                  const hasDetail = Boolean(
                    projection.details && Object.prototype.hasOwnProperty.call(projection.details, row.id),
                  );
                  const isSponsorLink =
                    projection.id === "sponsor-outcomes" && !query.sponsor && sponsorKeys.has(row.id);
                  const actionHref = row.href
                    ?? (isSponsorLink
                      ? buildReportsHref(query, { sponsor: row.id, detail: null })
                      : hasDetail
                        ? toggleDetailHref(query, row.id)
                        : undefined);
                  const actionText = row.href
                    ? (projection.id === "series" ? copy.charts.openEventReport : copy.table.openLink)
                    : isSponsorLink
                      ? copy.charts.openSponsor
                      : selected
                        ? copy.table.selected
                        : copy.table.selectForBreakdown;

                  return (
                    <tr
                      className={selected ? styles.dataTableRowSelected : undefined}
                      key={row.id}
                    >
                      <td data-label={columns[0] ?? copy.table.itemColumn}>
                        <strong>{label}</strong>
                      </td>
                      {Array.from({ length: valueCount }).map((_, idx) => (
                        <td
                          className={styles.numericCell}
                          data-label={columns[idx + 1] ?? copy.table.valueColumn}
                          key={`${row.id}-v-${idx}`}
                        >
                          {formatDatumCell(projection, row, idx, locale)}
                        </td>
                      ))}
                      {hasRowCounts ? (
                        <td className={styles.numericCell} data-label={copy.table.ratioColumn}>
                          {row.counts?.[0]?.total === undefined ? "—" : formatCount(locale, row.counts[0].total)}
                        </td>
                      ) : null}
                      {hasAnyAction ? (
                        <td className={styles.actionCell} data-label={copy.table.actionColumn}>
                          {actionHref ? (
                            <Link
                              aria-current={selected ? "true" : undefined}
                              className={styles.rowLink}
                              href={actionHref}
                            >
                              <span>{actionText}</span>
                              <ChevronRightIcon height="14" width="14" />
                            </Link>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedDetailId ? (
        <div aria-live="polite" className={`${styles.tableBlock} ${styles.drilldownPanel}`}>
          <div className={styles.tableBlockHead}>
            <div>
              <h3 className={styles.tableBlockTitle}>
                {interpolate(copy.reports[projection.id].drilldownTitle, {
                  item: resolveDetailSubject(projection, selectedDetailId, locale),
                })}
              </h3>
            </div>
            <Link
              className={styles.clearLink}
              href={buildReportsHref(query, { detail: null })}
            >
              <CloseIcon height="13" width="13" />
              <span>{copy.table.clearSelection}</span>
            </Link>
          </div>

          {activeDetail ? (
            <BreakdownTable
              breakdown={activeDetail}
              caption={interpolate(copy.reports[projection.id].drilldownTitle, {
                item: resolveDetailSubject(projection, selectedDetailId, locale),
              })}
              locale={locale}
            />
          ) : (
            <p className={styles.seriesNote}>{copy.status.unknownDetail}</p>
          )}
        </div>
      ) : null}

      {projection.breakdown ? (
        <div className={styles.tableBlock}>
          <div className={styles.tableBlockHead}>
            <h3 className={styles.tableBlockTitle}>{copy.table.breakdownHeading}</h3>
            <span className={styles.tableBlockMeta}>
              {interpolate(copy.table.rowCount, { count: formatCount(locale, projection.breakdown.rows.length) })}
            </span>
          </div>
          <BreakdownTable
            breakdown={projection.breakdown}
            caption={copy.table.breakdownHeading}
            locale={locale}
          />
        </div>
      ) : null}
    </section>
  );
}
