import { CityArtwork } from "@/shared/ui/city-artwork";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  SortIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { eventsData, statusLabels, type EventRow } from "../events-data";

function ProgressCell({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="table-empty">—</span>;
  }

  return (
    <div className="progress-cell">
      <span>{value}%</span>
      <span className="progress-track"><span className="progress-fill" style={{ width: `${value}%` }} /></span>
    </div>
  );
}

function EventTableRow({ event }: { event: EventRow }) {
  return (
    <tr>
      <td>
        <div className="event-name">
          <CityArtwork art={event.art} className="mini-city" />
          <span>{event.name}</span>
        </div>
      </td>
      <td className="cell-muted">{event.city}</td>
      <td className="cell-muted">{event.date}</td>
      <td><span className={`status-pill status-pill--${event.status}`}>{statusLabels[event.status]}</span></td>
      <td>{event.attendees}</td>
      <td>{event.introductions ?? <span className="table-empty">—</span>}</td>
      <td><ProgressCell value={event.valuable} /></td>
      <td><ProgressCell value={event.repeatAttendees} /></td>
      <td className="cell-action"><ChevronRightIcon height="15" width="15" /></td>
    </tr>
  );
}

export function AllEventsTable() {
  return (
    <Surface as="section" className="panel table-panel all-events-panel" depth="raised" aria-labelledby="all-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <div>
            <h2 className="panel-title" id="all-events-title">All events</h2>
            <p className="panel-subtitle">A complete view of every We Are One experience.</p>
          </div>
        </div>
        <div className="panel-controls">
          <label className="search-field search-field--compact">
            <SearchIcon height="15" width="15" />
            <input aria-label="Search all events" placeholder="Search events…" type="search" />
          </label>
          <TactileButton className="compact-select">Most recent <ChevronDownIcon height="14" width="14" /></TactileButton>
        </div>
      </div>
      <div className="table-scroll">
        <table className="event-table all-events-table">
          <thead>
            <tr>
              <th><span className="sortable">Event <SortIcon height="11" width="11" /></span></th>
              <th>City</th>
              <th>Date</th>
              <th>Status</th>
              <th>Attendees</th>
              <th>Introductions</th>
              <th>Valuable</th>
              <th>Repeat attendees</th>
              <th><span className="chart-summary">Open</span></th>
            </tr>
          </thead>
          <tbody className="table-body-well" data-depth="inset">
            {eventsData.all.map((event) => <EventTableRow event={event} key={event.name} />)}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>Showing 8 of 12 events</span>
        <nav aria-label="Events pagination" className="pagination">
          <TactileButton aria-label="Previous page" className="page-button" disabled><ArrowLeftIcon height="15" width="15" /></TactileButton>
          <TactileButton aria-current="page" className="page-button" variant="graphite">1</TactileButton>
          <TactileButton className="page-button">2</TactileButton>
          <TactileButton aria-label="Next page" className="page-button"><ArrowRightIcon height="15" width="15" /></TactileButton>
        </nav>
      </div>
    </Surface>
  );
}
