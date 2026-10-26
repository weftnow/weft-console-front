"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import type { EventSummaryDto } from "@/modules/events/event-dto";
import { eventArt, formatCountdown, groupEvents } from "@/modules/events/event-list";
import { formatEventDateRange } from "@/modules/events/event-record";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { CityArtwork } from "@/shared/ui/city-artwork";
import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, ChevronRightIcon, LocationIcon, OutcomesIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

function Hero({ events }: { events: EventSummaryDto[] }) {
  const i18n = useI18n();
  const copy = i18n.dict.insights;
  const cities = new Set(events.map((event) => event.city)).size;
  const next = groupEvents(events).upcoming[0];
  return (
    <Surface as="section" className="hero-panel" depth="raised" aria-labelledby="overview-heading">
      <div className="hero-copy">
        <p className="section-kicker">{copy.overview}</p>
        <h1 className="hero-title" id="overview-heading">{copy.title}</h1>
        {events.length ? (
          <p className="hero-meta">
            <span>{i18n.t(copy.across, { events: i18n.plural(copy.events, events.length), cities: i18n.plural(copy.cities, cities) })}</span>
            {next ? <><span>·</span><span>{i18n.t(copy.next, { name: next.name, dates: formatEventDateRange(i18n, next.startDate, next.endDate) })}</span></> : null}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}

function Metric({ icon: Icon, label, value }: { icon: Glyph; label: string; value: number }) {
  const { number } = useI18n();
  return (
    <Surface as="article" className="metric" depth="raised">
      <Surface className="metric__icon" depth="inset"><Icon /></Surface>
      <div className="metric__value">{number(value)}</div><div className="metric__label">{label}</div>
    </Surface>
  );
}

function EventsTable({ events, total }: { events: EventSummaryDto[]; total: number }) {
  const i18n = useI18n();
  const copy = i18n.dict.insights;
  return (
    <Surface as="section" className="panel table-panel" depth="raised" aria-labelledby="event-performance-title">
      <div className="panel-heading"><h2 className="panel-title" id="event-performance-title">{copy.table.heading}</h2></div>
      <div className="table-scroll">
        <table className="event-table">
          <thead><tr><th>{copy.table.event}</th><th>{copy.table.city}</th><th>{copy.table.date}</th><th>{copy.table.guests}</th><th><span className="chart-summary">{copy.table.open}</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork className="mini-city" art={eventArt(event)} /><span>{event.name}</span></div></td>
                <td>{i18n.dict.events.options.cities[event.city as keyof typeof i18n.dict.events.options.cities] ?? event.city}</td><td>{formatEventDateRange(i18n, event.startDate, event.endDate)}</td><td>{i18n.number(event.guestCount)}</td>
                <td><Link aria-label={i18n.t(copy.openNamed, { name: event.name })} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>{i18n.plural(copy.showing, total, { shown: events.length })}</span><Link className="text-link" href="/events">{copy.viewAll} <ArrowRightIcon height="15" width="15" /></Link></div>
    </Surface>
  );
}

function UpcomingEvents({ events }: { events: EventSummaryDto[] }) {
  const i18n = useI18n();
  const copy = i18n.dict.insights;
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-title">
      <div className="panel-heading"><h2 className="panel-title" id="upcoming-title">{copy.upcomingHeading}</h2></div>
      {events.length === 0 ? <EmptyState icon={CalendarIcon} size="panel" title={copy.noUpcoming} /> : (
        <div className="event-card-grid">
          {events.map((event) => (
            <Surface as="article" className="event-card" depth="inset" key={event.id}>
              <CityArtwork className="city-art--large" art={eventArt(event)} />
              <div className="event-card__body"><h3>{event.name}</h3><p>{i18n.dict.events.options.cities[event.city as keyof typeof i18n.dict.events.options.cities] ?? event.city}</p><div className="event-meta"><span><CalendarIcon height="13" width="13" />{formatEventDateRange(i18n, event.startDate, event.endDate)}</span><span><PeopleIcon height="13" width="13" />{i18n.plural(copy.guests, event.guestCount, { count: i18n.number(event.guestCount) })}</span><span>{formatCountdown(i18n, event.startsAt)}</span></div></div>
              <Link aria-label={i18n.t(copy.openNamed, { name: event.name })} className="tactile-button tactile-button--neutral tactile-button--icon" href={`/events/${event.id}`}><ArrowRightIcon height="17" width="17" /></Link>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}

export function OrganizerOverview({ context, events }: { context: ConsoleContext; events: EventSummaryDto[] }) {
  const { dict } = useI18n();
  const copy = dict.insights;
  const grouped = groupEvents(events);
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="overview" context={context} />
        <main className="dashboard-main">
          <div className="content-stack">
            <Hero events={events} />
            {events.length === 0 ? (
              <Surface as="section" className="panel" depth="raised">
                <EmptyState
                  action={<Link className="tactile-button tactile-button--primary" href="/events/new">{dict.events.list.createEvent}</Link>}
                  description={copy.emptyDescription}
                  icon={CalendarIcon}
                  title={dict.events.list.emptyTitle}
                />
              </Surface>
            ) : (
              <>
                <section aria-label={copy.metricsLabel} className="metrics-grid">
                  <Metric icon={CalendarIcon} label={copy.metrics.events} value={events.length} />
                  <Metric icon={PeopleIcon} label={copy.metrics.guests} value={events.reduce((sum, event) => sum + event.guestCount, 0)} />
                  <Metric icon={CalendarIcon} label={copy.metrics.upcoming} value={grouped.upcoming.length} />
                  <Metric icon={LocationIcon} label={copy.metrics.cities} value={new Set(events.map((event) => event.city)).size} />
                </section>
                <Surface as="section" className="panel" depth="raised" aria-label={copy.outcomesLabel}>
                  <EmptyState description={copy.noDataDescription} icon={OutcomesIcon} size="panel" title={copy.noData} />
                </Surface>
                <EventsTable events={grouped.all.slice(0, 5)} total={events.length} />
                <UpcomingEvents events={grouped.upcoming.slice(0, 3)} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
