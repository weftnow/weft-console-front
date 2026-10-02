import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { CalendarIcon, ChevronRightIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

const statusLabels = { live: "Live", upcoming: "Upcoming", completed: "Completed" } as const;

export function AllEventsTable({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel table-panel all-events-panel" depth="raised" aria-labelledby="all-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="all-events-title">All events</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table className="event-table all-events-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Status</th><th>Guests</th><th><span className="chart-summary">Open</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork art={eventArt(event)} className="mini-city" /><Link href={`/events/${event.id}`}>{event.name}</Link></div></td>
                <td className="cell-muted">{event.city}</td>
                <td className="cell-muted">{formatEventDateRange(event.startDate, event.endDate)}</td>
                <td><span className={`status-pill status-pill--${event.status}`}>{statusLabels[event.status]}</span></td>
                <td>{event.guestCount.toLocaleString()}</td>
                <td className="cell-action"><Link aria-label={`Open ${event.name}`} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {events.length} {events.length === 1 ? "event" : "events"}</span></div>
    </Surface>
  );
}
