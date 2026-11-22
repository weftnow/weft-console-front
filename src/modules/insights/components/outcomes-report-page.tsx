"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import type { OutcomesReport } from "@/modules/insights/outcomes-report";
import { outcomesHref } from "@/modules/insights/outcomes-navigation";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { I18n } from "@/shared/i18n/i18n";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  OutcomesIcon,
  PeopleIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { OutcomesEventFilter } from "./outcomes-event-filter";
import { OutcomesByEvent } from "./outcomes-by-event";
import { OutcomesTimeline } from "./outcomes-timeline";

function formatEventTimestamp(i18n: I18n, iso: string, timezone: string): string {
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  try {
    return i18n.date(iso, options, timezone || undefined);
  } catch {
    return i18n.date(iso, options);
  }
}

function StartTrackingButton() {
  const { pending } = useFormStatus();
  const copy = useI18n().dict.insights.outcomes;
  return (
    <TactileButton disabled={pending} type="submit" variant="primary">
      {pending ? copy.startingTracking : copy.startTracking}
    </TactileButton>
  );
}

export function OutcomesReportPage({
  organizationName,
  report,
  startTrackingAction,
}: {
  organizationName: string;
  report: OutcomesReport;
  startTrackingAction?: (formData: FormData) => Promise<void>;
}) {
  const i18n = useI18n();
  const copy = i18n.dict.insights.outcomes;
  const isFiltered = report.selectedEventId !== null;
  const selectedEvent = isFiltered
    ? (report.events.find((event) => event.eventId === report.selectedEventId) ?? report.events[0] ?? null)
    : null;
  const hasEvents = report.totals.totalEvents > 0 || report.events.length > 0;
  const isPartialCoverage = !isFiltered && report.totals.trackedEvents > 0 && report.totals.trackedEvents < report.totals.totalEvents;
  const isAllUntracked = !isFiltered && report.totals.totalEvents > 0 && report.totals.trackedEvents === 0;
  const isAllTrackedZero = !isFiltered && report.totals.trackedEvents > 0 && report.totals.completedIntroductions === 0;

  return (
    <main className="dashboard-main outcomes-main" data-simulated={report.simulated ? "true" : undefined}>
      <header className="events-header outcomes-header">
        <div className="events-header__copy">
          <p className="section-kicker outcomes-header__kicker">{copy.kicker}</p>
          <h1 className="events-header__title">{copy.title}</h1>
          <p className="events-header__subtitle">{copy.subtitle}</p>
        </div>
        {report.eventOptions.length > 0 ? (
          <div className="outcomes-header__controls">
            <OutcomesEventFilter eventOptions={report.eventOptions} selectedEventId={report.selectedEventId} />
          </div>
        ) : null}
      </header>

      <div className="content-stack">
        {!hasEvents ? (
          <Surface as="section" className="panel" depth="raised">
            <EmptyState
              action={
                <Link className="tactile-button tactile-button--primary" href="/events/new">
                  {i18n.dict.events.list.createEvent}
                </Link>
              }
              description={copy.noEventsDescription}
              icon={CalendarIcon}
              title={copy.noEventsTitle}
            />
          </Surface>
        ) : (
          <>
            <Surface as="section" aria-label={copy.scopeLabel} className="outcomes-scope" depth="raised">
              <div className="outcomes-scope__copy">
                <span className="outcomes-scope__label">{copy.scopeLabel}</span>
                <strong className="outcomes-scope__value">
                  {selectedEvent
                    ? i18n.t(copy.scopeEvent, { event: selectedEvent.eventName })
                    : i18n.t(copy.scopeAll, { organization: organizationName })}
                </strong>
                {selectedEvent ? (
                  <span className="outcomes-scope__meta">
                    {formatEventTimestamp(i18n, selectedEvent.startsAt, selectedEvent.timezone)}
                  </span>
                ) : null}
              </div>
              <div className="outcomes-scope__actions">
                {selectedEvent ? (
                  <>
                    <Link className="tactile-button tactile-button--neutral outcomes-scope__action" href="/outcomes">
                      <ArrowLeftIcon height="15" width="15" /> {copy.backToAll}
                    </Link>
                    <Link className="tactile-button tactile-button--neutral outcomes-scope__action" href={`/events/${selectedEvent.eventId}`}>
                      {copy.openEvent} <ArrowRightIcon height="15" width="15" />
                    </Link>
                  </>
                ) : null}
              </div>
            </Surface>

            {selectedEvent ? (
              selectedEvent.trackingStartedAt === null ? (
                <Surface as="section" aria-label={copy.metricsLabel} className="panel outcomes-untracked-panel" depth="raised">
                  <EmptyState
                    action={
                      report.simulated ? (
                        <Link className="tactile-button tactile-button--neutral" href={`/events/${selectedEvent.eventId}?tab=matches`}>
                          {copy.openMatches}
                        </Link>
                      ) : startTrackingAction ? (
                        <form action={startTrackingAction} className="outcomes-start-form">
                          <input name="eventId" type="hidden" value={selectedEvent.eventId} />
                          <StartTrackingButton />
                        </form>
                      ) : undefined
                    }
                    description={report.simulated ? copy.awaitingMatches : i18n.t(copy.untrackedEventDescription, { event: selectedEvent.eventName })}
                    icon={ClockIcon}
                    size="panel"
                    title={copy.untrackedEventTitle}
                  />
                </Surface>
              ) : (
                <>
                  <section aria-label={copy.metricsLabel} className="outcomes-metrics outcomes-metrics--event">
                    <Surface as="article" className="metric metric--selected outcomes-metric" depth="raised">
                      <Surface className="metric__icon" depth="inset">
                        <CheckIcon height="20" width="20" />
                      </Surface>
                      <div className="metric__value">{i18n.number(selectedEvent.completedIntroductions)}</div>
                      <div className="metric__label">{copy.metrics.completedIntroductions}</div>
                      <p className="outcomes-metric__hint">{copy.metrics.completedIntroductionsHint}</p>
                    </Surface>
                    <Surface as="article" className="metric outcomes-metric" depth="raised">
                      <Surface className="metric__icon" depth="inset">
                        <PeopleIcon height="20" width="20" />
                      </Surface>
                      <div className="metric__value">{i18n.number(selectedEvent.peopleIntroduced)}</div>
                      <div className="metric__label">{copy.metrics.peopleIntroduced}</div>
                      <p className="outcomes-metric__hint">{copy.metrics.peopleIntroducedEventHint}</p>
                    </Surface>
                    <Surface as="article" className="metric outcomes-metric outcomes-metric--status" depth="raised">
                      <Surface className="metric__icon" depth="inset">
                        <ClockIcon height="20" width="20" />
                      </Surface>
                      <div className="outcomes-metric__status-wrap">
                        <span className="status-pill status-pill--completed">{copy.table.statusTracked}</span>
                      </div>
                      <div className="metric__label">{copy.metrics.trackingStatus}</div>
                      <p className="outcomes-metric__hint">
                        {i18n.t(copy.metrics.trackingSince, {
                          date: formatEventTimestamp(i18n, selectedEvent.trackingStartedAt, selectedEvent.timezone),
                        })}
                      </p>
                    </Surface>
                  </section>

                  {selectedEvent.completedIntroductions === 0 ? (
                    <Surface as="section" className="outcomes-callout" depth="inset">
                      <OutcomesIcon height="18" width="18" />
                      <div>
                        <strong>{copy.trackedZeroTitle}</strong>
                        <p>
                          {i18n.t(copy.trackedZeroEventDescription, {
                            date: formatEventTimestamp(i18n, selectedEvent.trackingStartedAt, selectedEvent.timezone),
                          })}
                        </p>
                      </div>
                    </Surface>
                  ) : null}
                </>
              )
            ) : isAllUntracked ? (
              <Surface as="section" aria-label={copy.metricsLabel} className="panel" depth="raised">
                <EmptyState
                  description={report.simulated ? copy.awaitingMatches : copy.untrackedAllDescription}
                  icon={OutcomesIcon}
                  size="panel"
                  title={copy.untrackedAllTitle}
                />
              </Surface>
            ) : (
              <>
                <section aria-label={copy.metricsLabel} className="outcomes-metrics outcomes-metrics--summary">
                  <Surface as="article" className="metric metric--selected outcomes-metric" depth="raised">
                    <Surface className="metric__icon" depth="inset">
                      <CheckIcon height="20" width="20" />
                    </Surface>
                    <div className="metric__value">{i18n.number(report.totals.completedIntroductions)}</div>
                    <div className="metric__label">{copy.metrics.completedIntroductions}</div>
                    <p className="outcomes-metric__hint">{copy.metrics.completedIntroductionsHint}</p>
                  </Surface>
                  <Surface as="article" className="metric outcomes-metric" depth="raised">
                    <Surface className="metric__icon" depth="inset">
                      <CalendarIcon height="20" width="20" />
                    </Surface>
                    <div className="metric__value">
                      {i18n.t(copy.metrics.trackedOfTotal, {
                        tracked: i18n.number(report.totals.trackedEvents),
                        total: i18n.number(report.totals.totalEvents),
                      })}
                    </div>
                    <div className="metric__label">{copy.metrics.trackedEvents}</div>
                    <p className={`outcomes-metric__hint ${isPartialCoverage ? "outcomes-metric__hint--partial" : ""}`}>
                      {isPartialCoverage ? copy.metrics.coveragePartial : copy.metrics.coverageFull}
                    </p>
                  </Surface>
                </section>

                {isAllTrackedZero ? (
                  <Surface as="section" className="outcomes-callout" depth="inset">
                    <OutcomesIcon height="18" width="18" />
                    <div>
                      <strong>{copy.trackedZeroTitle}</strong>
                      <p>{copy.trackedZeroAllDescription}</p>
                    </div>
                  </Surface>
                ) : null}
              </>
            )}

            <p className="outcomes-methodology">{copy.methodology}</p>

            <OutcomesTimeline days={report.recordedByDay} />
            {!isFiltered && report.totals.trackedEvents > 0 ? <Surface className="panel" depth="raised">
              <OutcomesByEvent events={report.events} compare />
            </Surface> : null}

            <Surface as="section" aria-labelledby="outcomes-events-heading" className="panel table-panel outcomes-table-panel" depth="raised">
              <div className="panel-heading">
                <div className="section-head">
                  <OutcomesIcon className="section-head__icon" height="19" width="19" />
                  <div>
                    <h2 className="panel-title" id="outcomes-events-heading">
                      {selectedEvent ? copy.table.singleHeading : copy.table.heading}
                    </h2>
                    <p className="panel-subtitle">{copy.table.peopleNote}</p>
                  </div>
                </div>
              </div>
              <div className="table-scroll">
                <table className="event-table outcomes-table" role="table">
                  <caption className="sr-only">{copy.table.caption}</caption>
                  <thead role="rowgroup">
                    <tr role="row">
                      <th scope="col">{copy.table.event}</th>
                      <th scope="col">{copy.table.date}</th>
                      <th scope="col">{copy.table.tracking}</th>
                      <th className="cell-number" scope="col">{copy.table.completedIntroductions}</th>
                      <th className="cell-number" scope="col">{copy.table.peopleIntroduced}</th>
                      <th scope="col"><span className="sr-only">{copy.table.actions}</span></th>
                    </tr>
                  </thead>
                  <tbody className="table-body-well" data-depth="inset" role="rowgroup">
                    {report.events.map((event) => {
                      const isTracked = event.trackingStartedAt !== null;
                      const trackedDate = isTracked
                        ? formatEventTimestamp(i18n, event.trackingStartedAt!, event.timezone)
                        : null;
                      const rowHref = isFiltered ? `/events/${event.eventId}` : outcomesHref(event.eventId);
                      const rowActionLabel = isFiltered
                        ? i18n.t(copy.table.openEventDetail, { name: event.eventName })
                        : i18n.t(copy.table.filterEvent, { name: event.eventName });
                      return (
                        <tr key={event.eventId} role="row">
                          <td className="outcomes-event-cell" data-label={copy.table.event} role="cell">
                            <Link className="outcomes-event-link" href={rowHref}>
                              {event.eventName}
                            </Link>
                          </td>
                          <td className="cell-muted" data-label={copy.table.date} role="cell">
                            {formatEventTimestamp(i18n, event.startsAt, event.timezone)}
                          </td>
                          <td data-label={copy.table.tracking} role="cell">
                            <div className="outcomes-tracking-cell">
                              <span className={`status-pill ${isTracked ? "status-pill--completed" : "status-pill--upcoming"}`}>
                                {isTracked ? copy.table.statusTracked : copy.table.statusUntracked}
                              </span>
                              {trackedDate ? (
                                <span className="outcomes-tracking-cell__since">
                                  {i18n.t(copy.table.since, { date: trackedDate })}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="cell-number" data-label={copy.table.completedIntroductions} role="cell">
                            {isTracked ? (
                              i18n.number(event.completedIntroductions)
                            ) : (
                              <span aria-label={copy.table.unavailableValue} className="table-empty">—</span>
                            )}
                          </td>
                          <td className="cell-number" data-label={copy.table.peopleIntroduced} role="cell">
                            {isTracked ? (
                              i18n.number(event.peopleIntroduced)
                            ) : (
                              <span aria-label={copy.table.unavailableValue} className="table-empty">—</span>
                            )}
                          </td>
                          <td className="cell-action outcomes-action-cell" role="cell">
                            <Link aria-label={rowActionLabel} className="outcomes-row-action" href={rowHref}>
                              <span>{isFiltered ? copy.openEvent : copy.table.viewEventReport}</span>
                              <ChevronRightIcon height="15" width="15" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="table-footer">
                <span>{i18n.plural(copy.table.showing, report.events.length)}</span>
              </div>
            </Surface>
          </>
        )}
      </div>
    </main>
  );
}
