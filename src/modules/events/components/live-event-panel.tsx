import Link from "next/link";

import { CityArtwork } from "@/shared/ui/city-artwork";
import { ArrowRightIcon, ClockIcon, LinkIcon, PeopleIcon } from "@/shared/ui/icons";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { Surface } from "@/shared/ui/surface";
import { eventsData, type LiveEventMetric } from "../events-data";

const glyphs = {
  clock: ClockIcon,
  link: LinkIcon,
  people: PeopleIcon,
};

function LiveMetric({ metric }: { metric: LiveEventMetric }) {
  const Glyph = glyphs[metric.glyph];

  return (
    <article className="live-metric">
      {metric.ring === undefined ? (
        <Surface className="live-metric__glyph" depth="inset"><Glyph height="18" width="18" /></Surface>
      ) : (
        <ProgressRing ariaLabel={`${metric.ring}% ${metric.label.toLowerCase()}`} size={38} thickness={6} value={metric.ring} />
      )}
      <div className="live-metric__body">
        <strong className="live-metric__value">{metric.value}</strong>
        <span className="live-metric__label">{metric.label}</span>
      </div>
    </article>
  );
}

export function LiveEventPanel() {
  const { art, caption, dates, location, metrics, name } = eventsData.live;

  return (
    <Surface as="section" className="panel live-panel" depth="raised" aria-labelledby="live-event-title">
      <CityArtwork art={art} className="city-art--cinematic" eager>
        <span className="live-badge"><span /> Live</span>
        <span className="city-art__scrim" />
        <span className="city-art__caption">
          <strong>{caption.title}</strong>
          <span>{caption.subtitle}</span>
          <em>{caption.dates}</em>
        </span>
      </CityArtwork>
      <div className="live-body">
        <div className="live-headline">
          <div>
            <p className="live-flag"><span className="live-dot" /> Live now</p>
            <h2 className="live-title" id="live-event-title">{name}</h2>
            <p className="live-meta">{dates} &nbsp;•&nbsp; {location}</p>
          </div>
          <Link className="tactile-button tactile-button--graphite live-action" href="/events/las-vegas-f1-week">
            Open event <ArrowRightIcon height="16" width="16" />
          </Link>
        </div>
        <div className="live-metrics">
          {metrics.map((metric) => <LiveMetric key={metric.label} metric={metric} />)}
        </div>
      </div>
    </Surface>
  );
}
