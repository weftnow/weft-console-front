import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function LiveEventPanel({ event }: { event: EventSummaryDto | null }) {
  if (!event) {
    return (
      <Surface as="section" className="panel" depth="raised" aria-label="Live event">
        <EmptyState icon={CalendarIcon} size="panel" title="No live events right now" />
      </Surface>
    );
  }
  const dates = formatEventDateRange(event.startDate, event.endDate);
  return (
    <Surface as="section" className="panel live-panel" depth="raised" aria-labelledby="live-event-title">
      <CityArtwork art={eventArt(event)} className="city-art--cinematic" eager>
        <span className="live-badge"><span /> Live</span>
        <span className="city-art__scrim" />
        <span className="city-art__caption"><strong>{event.city}</strong><em>{dates}</em></span>
      </CityArtwork>
      <div className="live-body">
        <div className="live-headline">
          <div>
            <p className="live-flag"><span className="live-dot" /> Live now</p>
            <h2 className="live-title" id="live-event-title">{event.name}</h2>
            <p className="live-meta">{dates} &nbsp;•&nbsp; {event.venue || event.city}</p>
          </div>
          <Link className="tactile-button tactile-button--graphite live-action" href={`/events/${event.id}`}>
            Open event <ArrowRightIcon height="16" width="16" />
          </Link>
        </div>
        <div className="live-metrics">
          <article className="live-metric">
            <Surface className="live-metric__glyph" depth="inset"><PeopleIcon height="18" width="18" /></Surface>
            <div className="live-metric__body">
              <strong className="live-metric__value">{event.guestCount.toLocaleString()}</strong>
              <span className="live-metric__label">Guests</span>
            </div>
          </article>
        </div>
      </div>
    </Surface>
  );
}
