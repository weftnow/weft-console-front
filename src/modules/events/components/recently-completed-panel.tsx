import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function RecentlyCompletedPanel({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel report-panel" depth="raised" aria-labelledby="recently-completed-title">
      <div className="panel-heading">
        <div className="section-head">
          <OutcomesIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="recently-completed-title">Recently completed</h2>
        </div>
      </div>
      {events.length === 0 ? <EmptyState icon={OutcomesIcon} size="panel" title="No completed events yet" /> : (
        <div className="report-grid">
          {events.map((event) => (
            <Surface as="article" className="report-card" depth="inset" key={event.id}>
              <CityArtwork art={eventArt(event)} className="city-art--photo report-card__art" />
              <div className="report-card__body">
                <h3>{event.name}</h3>
                <p className="report-card__meta">{event.city} &nbsp;·&nbsp; {formatEventDateRange(event.startDate, event.endDate)}</p>
                <div className="report-stats"><div><strong>{event.guestCount.toLocaleString()}</strong><span>Guests</span></div></div>
                <Link className="tactile-button card-action" href={`/events/${event.id}`}>
                  Open event <ArrowRightIcon height="15" width="15" />
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}
