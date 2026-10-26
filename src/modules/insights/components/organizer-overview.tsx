import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import type { EventSummaryDto } from "@/modules/events/event-dto";
import { eventArt, formatCountdown, groupEvents } from "@/modules/events/event-list";
import { formatEventDateRange } from "@/modules/events/event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, ChevronRightIcon, LocationIcon, OutcomesIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

function Hero({ events }: { events: EventSummaryDto[] }) {
  const cities = new Set(events.map((event) => event.city)).size;
  const next = groupEvents(events).upcoming[0];
  return (
    <Surface as="section" className="hero-panel" depth="raised" aria-labelledby="overview-heading">
      <div className="hero-copy">
        <p className="section-kicker">Overview</p>
        <h1 className="hero-title" id="overview-heading">Your event network</h1>
        {events.length ? (
          <p className="hero-meta">
            <span>{events.length} {events.length === 1 ? "event" : "events"} across {cities} {cities === 1 ? "city" : "cities"}</span>
            {next ? <><span>·</span><span>Next: {next.name}, {formatEventDateRange(next.startDate, next.endDate)}</span></> : null}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}

function Metric({ icon: Icon, label, value }: { icon: Glyph; label: string; value: number }) {
  return (
    <Surface as="article" className="metric" depth="raised">
      <Surface className="metric__icon" depth="inset"><Icon /></Surface>
      <div className="metric__value">{value.toLocaleString()}</div><div className="metric__label">{label}</div>
    </Surface>
  );
}

function EventsTable({ events, total }: { events: EventSummaryDto[]; total: number }) {
  return (
    <Surface as="section" className="panel table-panel" depth="raised" aria-labelledby="event-performance-title">
      <div className="panel-heading"><h2 className="panel-title" id="event-performance-title">Your events</h2></div>
      <div className="table-scroll">
        <table className="event-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Guests</th><th><span className="chart-summary">Open</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork className="mini-city" art={eventArt(event)} /><span>{event.name}</span></div></td>
                <td>{event.city}</td><td>{formatEventDateRange(event.startDate, event.endDate)}</td><td>{event.guestCount.toLocaleString()}</td>
                <td><Link aria-label={`Open ${event.name}`} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {events.length} of {total} {total === 1 ? "event" : "events"}</span><Link className="text-link" href="/events">View all events <ArrowRightIcon height="15" width="15" /></Link></div>
    </Surface>
  );
}

function UpcomingEvents({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-title">
      <div className="panel-heading"><h2 className="panel-title" id="upcoming-title">Upcoming events</h2></div>
      {events.length === 0 ? <EmptyState icon={CalendarIcon} size="panel" title="No upcoming events" /> : (
        <div className="event-card-grid">
          {events.map((event) => (
            <Surface as="article" className="event-card" depth="inset" key={event.id}>
              <CityArtwork className="city-art--large" art={eventArt(event)} />
              <div className="event-card__body"><h3>{event.name}</h3><p>{event.city}</p><div className="event-meta"><span><CalendarIcon height="13" width="13" />{formatEventDateRange(event.startDate, event.endDate)}</span><span><PeopleIcon height="13" width="13" />{event.guestCount.toLocaleString()} guests</span><span>{formatCountdown(event.startsAt)}</span></div></div>
              <Link aria-label={`Open ${event.name}`} className="tactile-button tactile-button--neutral tactile-button--icon" href={`/events/${event.id}`}><ArrowRightIcon height="17" width="17" /></Link>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}

export function OrganizerOverview({ context, events }: { context: ConsoleContext; events: EventSummaryDto[] }) {
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
                  action={<Link className="tactile-button tactile-button--primary" href="/events/new">Create event</Link>}
                  description="Create your first event to start measuring networking outcomes."
                  icon={CalendarIcon}
                  title="No events yet"
                />
              </Surface>
            ) : (
              <>
                <section aria-label="Network overview metrics" className="metrics-grid">
                  <Metric icon={CalendarIcon} label="Events" value={events.length} />
                  <Metric icon={PeopleIcon} label="Guests" value={events.reduce((sum, event) => sum + event.guestCount, 0)} />
                  <Metric icon={CalendarIcon} label="Upcoming" value={grouped.upcoming.length} />
                  <Metric icon={LocationIcon} label="Cities" value={new Set(events.map((event) => event.city)).size} />
                </section>
                <Surface as="section" className="panel" depth="raised" aria-label="Networking outcomes">
                  <EmptyState description="Outcomes appear here once your events have introductions." icon={OutcomesIcon} size="panel" title="Not enough data yet" />
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
