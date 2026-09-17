import { CityArtwork } from "@/shared/ui/city-artwork";
import {
  ArrowRightIcon,
  CalendarIcon,
  PeopleIcon,
  StaffIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { eventsData } from "../events-data";

export function UpcomingEventsPanel() {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="upcoming-events-title">Upcoming events</h2>
        </div>
        <a className="text-link" href="#upcoming">View all upcoming <ArrowRightIcon height="15" width="15" /></a>
      </div>
      <div className="upcoming-grid">
        {eventsData.upcoming.map((event) => (
          <Surface as="article" className="upcoming-card" depth="inset" key={event.name}>
            <CityArtwork art={event.art} className="city-art--photo upcoming-card__art" />
            <div className="upcoming-card__body">
              <div className="upcoming-card__head">
                <h3>{event.name}</h3>
                <span className="countdown-pill">{event.countdown}</span>
              </div>
              <p className="upcoming-card__date">{event.date}</p>
              <div className="event-meta upcoming-card__meta">
                <span><PeopleIcon height="13" width="13" />{event.registered} registered</span>
                <span><StaffIcon height="13" width="13" />{event.staff} staff assigned</span>
              </div>
              <TactileButton className="card-action">
                View event <ArrowRightIcon height="15" width="15" />
              </TactileButton>
            </div>
          </Surface>
        ))}
      </div>
    </Surface>
  );
}
