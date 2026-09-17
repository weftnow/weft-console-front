import { CityArtwork } from "../../../shared/ui/city-artwork";
import { ArrowRightIcon, OutcomesIcon } from "../../../shared/ui/icons";
import { ProgressRing } from "../../../shared/ui/progress-ring";
import { Surface } from "../../../shared/ui/surface";
import { TactileButton } from "../../../shared/ui/tactile-button";
import { eventsData } from "../events-data";

export function RecentlyCompletedPanel() {
  return (
    <Surface as="section" className="panel report-panel" depth="raised" aria-labelledby="recently-completed-title">
      <div className="panel-heading">
        <div className="section-head">
          <OutcomesIcon className="section-head__icon" height="19" width="19" />
          <div>
            <h2 className="panel-title" id="recently-completed-title">Recently completed</h2>
            <p className="panel-subtitle">Highlights from our latest experiences.</p>
          </div>
        </div>
        <a className="text-link" href="#completed">View all completed <ArrowRightIcon height="15" width="15" /></a>
      </div>
      <div className="report-grid">
        {eventsData.completed.map((event) => (
          <Surface as="article" className="report-card" depth="inset" key={event.name}>
            <CityArtwork art={event.art} className="city-art--photo report-card__art" />
            <div className="report-card__body">
              <h3>{event.name}</h3>
              <p className="report-card__meta">{event.city} &nbsp;·&nbsp; {event.date}</p>
              <div className="report-stats">
                <div><strong>{event.attendees}</strong><span>Attendees</span></div>
                <div><strong>{event.introductions}</strong><span>Introductions</span></div>
                <div className="report-ring">
                  <ProgressRing ariaLabel={`${event.valuable}% valuable connections`} size={34} thickness={5} value={event.valuable} />
                  <div><strong>{event.valuable}%</strong><span>Valuable</span></div>
                </div>
              </div>
              <TactileButton className="card-action">
                View report <ArrowRightIcon height="15" width="15" />
              </TactileButton>
            </div>
          </Surface>
        ))}
      </div>
    </Surface>
  );
}
