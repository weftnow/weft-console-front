import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt, formatCountdown } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function UpcomingEventsPanel({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="upcoming-events-title">Upcoming events</h2>
        </div>
      </div>
      {events.length === 0 ? <EmptyState icon={CalendarIcon} size="panel" title="No upcoming events" /> : (
        <div className="upcoming-grid">
          {events.map((event) => (
            <Surface as="article" className="upcoming-card" depth="inset" key={event.id}>
              <CityArtwork art={eventArt(event)} className="city-art--photo upcoming-card__art" />
              <div className="upcoming-card__body">
                <div className="upcoming-card__head">
                  <h3>{event.name}</h3>
                  <span className="countdown-pill">{formatCountdown(event.startsAt)}</span>
                </div>
                <p className="upcoming-card__date">{formatEventDateRange(event.startDate, event.endDate)} · {event.city}</p>
                <div className="event-meta upcoming-card__meta">
                  <span><PeopleIcon height="13" width="13" />{event.guestCount.toLocaleString()} guests</span>
                </div>
                <Link className="tactile-button card-action" href={`/events/${event.id}`}>
                  View event <ArrowRightIcon height="15" width="15" />
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}
