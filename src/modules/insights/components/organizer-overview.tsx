import type { CSSProperties, ReactNode } from "react";

import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  LinkIcon,
  LocationIcon,
  PeopleIcon,
  ShieldIcon,
  StarIcon,
  TrendIcon,
} from "@/shared/ui/icons";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import {
  organizerOverviewData,
  type CityTheme,
  type MetricIcon,
} from "../overview-data";
import { ConnectionQualityChart } from "./connection-quality-chart";
import { RepeatAttendanceChart } from "./repeat-attendance-chart";

function MetricGlyph({ icon }: { icon: MetricIcon }) {
  const icons: Record<MetricIcon, ReactNode> = {
    calendar: <CalendarIcon />,
    link: <LinkIcon />,
    people: <PeopleIcon />,
    repeat: <PeopleIcon />,
    star: <StarIcon />,
  };

  return icons[icon];
}

function CityArtwork({ className = "", theme }: { className?: string; theme: CityTheme }) {
  return (
    <div
      aria-hidden="true"
      className={`city-art ${className}`.trim()}
      style={{ "--horizon": theme.horizon, "--sky": theme.sky } as CSSProperties}
    />
  );
}

function FilterMenu({ icon, label, options }: { icon: ReactNode; label: string; options: string[] }) {
  return (
    <details className="filter-menu">
      <summary className="tactile-button filter-trigger">
        {icon}
        <span>{label}</span>
        <ChevronDownIcon height="15" width="15" />
      </summary>
      <Surface className="filter-options" depth="floating">
        {options.map((option) => <button key={option} type="button">{option}</button>)}
      </Surface>
    </details>
  );
}

function WorldMap() {
  return (
    <svg aria-hidden="true" className="hero-map" viewBox="0 0 620 240">
      <path className="continent" d="M46 51 82 27l77 2 27 20-8 23-35 3-21 19-10 38-22 16-18-28-4-28-27-16Z" />
      <path className="continent" d="m158 131 28 8 23 30-6 42-22 23-10-32-21-34Z" />
      <path className="continent" d="m261 54 36-13 25 9 39-13 90 14 48 25-7 24-34 5-10 19-31-3-24 35-38-11-12 49-22 14-22-41-26-20 4-38-25-26Z" />
      <path className="continent" d="m487 168 37-12 30 17 4 25-23 15-39-13Z" />
      <path className="route-shadow" d="M130 105 Q242 18 342 79 Q428 40 477 107" />
      <path className="route-shadow" d="M147 144 Q240 87 342 79" />
      <path className="route" d="M130 105 Q242 18 342 79 Q428 40 477 107" />
      <path className="route" d="M147 144 Q240 87 342 79" />
      <circle className="node" cx="130" cy="105" r="6" />
      <circle className="node" cx="147" cy="144" r="6" />
      <circle className="node" cx="342" cy="79" r="6" />
      <circle className="node" cx="477" cy="107" r="6" />
    </svg>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div className="eyebrow-line">People · Ideas · Opportunities · A stronger tomorrow</div>
      <div className="topbar-actions">
        <FilterMenu icon={<CalendarIcon height="17" width="17" />} label="All time" options={["All time", "This year", "Last 3 events"]} />
        <FilterMenu icon={<LocationIcon height="17" width="17" />} label="All cities" options={["All cities", "Miami", "Las Vegas", "Singapore"]} />
        <div className="brand-mini"><span className="brand-mini__disk">W</span><span>WE ARE ONE</span></div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <Surface as="section" className="hero-panel" depth="raised" aria-labelledby="overview-heading">
      <div className="hero-copy">
        <p className="section-kicker">Overview</p>
        <h1 className="hero-title" id="overview-heading">A global network<br />of extraordinary people.</h1>
        <p className="hero-meta"><span>12 events across 8 cities</span><span>·</span><span>Last event: Miami, Sep 12, 2026</span></p>
      </div>
      <WorldMap />
      <div className="hero-script">Move<br />Together.</div>
    </Surface>
  );
}

function Metrics() {
  return (
    <section aria-label="Network overview metrics" className="metrics-grid">
      {organizerOverviewData.metrics.map((metric) => (
        <Surface as="article" className={`metric ${metric.selected ? "metric--selected" : ""}`} depth="raised" key={metric.label}>
          <Surface className="metric__icon" depth="inset"><MetricGlyph icon={metric.icon} /></Surface>
          <div className="metric__value">{metric.value}</div>
          <div className="metric__label">{metric.label}</div>
          <div className="metric__trend"><TrendIcon height="14" width="14" />{metric.trend}</div>
          <p className="metric__comparison">{metric.comparison}</p>
        </Surface>
      ))}
    </section>
  );
}

function Analytics() {
  return (
    <section className="analytics-grid" aria-label="Network analytics">
      <Surface as="article" className="panel" depth="raised">
        <div className="panel-heading">
          <div><h2 className="panel-title">Connection quality over time</h2><p className="panel-subtitle">% of attendees reporting a valuable connection</p></div>
          <TactileButton className="compact-select">Valuable connections <ChevronDownIcon height="14" width="14" /></TactileButton>
        </div>
        <Surface className="chart-well" depth="inset"><ConnectionQualityChart points={organizerOverviewData.connectionQuality} /></Surface>
      </Surface>
      <Surface as="article" className="panel" depth="raised">
        <div className="panel-heading">
          <h2 className="panel-title">Network snapshot</h2>
          <TactileButton aria-label="View attendee details" iconOnly><PeopleIcon height="18" width="18" /></TactileButton>
        </div>
        <div className="snapshot-layout">
          <div className="snapshot-stats">
            <div className="snapshot-stat"><strong>1,840</strong><span>total attendees</span></div>
            <div className="snapshot-stat"><strong>572</strong><span>attended more than once</span></div>
            <div className="snapshot-stat"><strong>214</strong><span>attended 3+ events</span></div>
            <div className="snapshot-stat"><strong>8</strong><span>cities connected</span></div>
          </div>
          <div className="radial-wrap"><RepeatAttendanceChart percentage={31} /></div>
        </div>
        <Surface className="insight-callout" depth="inset"><GlobeIcon height="27" width="27" /><span>A growing global community,<br />coming back, city after city.</span></Surface>
      </Surface>
    </section>
  );
}

function EventPerformanceTable() {
  return (
    <Surface as="section" className="panel table-panel" depth="raised" aria-labelledby="event-performance-title">
      <div className="panel-heading">
        <h2 className="panel-title" id="event-performance-title">Event performance</h2>
        <TactileButton className="compact-select">Most recent <ChevronDownIcon height="14" width="14" /></TactileButton>
      </div>
      <div className="table-scroll">
        <table className="event-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Attendees</th><th>Introductions</th><th>Valuable</th><th>Repeat guests</th><th><span className="chart-summary">Open</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {organizerOverviewData.performance.map((event) => (
              <tr key={event.name}>
                <td><div className="event-name"><CityArtwork className="mini-city" theme={event.theme} /><span>{event.name}</span></div></td>
                <td>{event.city}</td><td>{event.date}</td><td>{event.attendees}</td><td>{event.introductions}</td>
                <td><div className="progress-cell"><span>{event.valuable}%</span><span className="progress-track"><span className="progress-fill" style={{ width: `${event.valuable}%` }} /></span></div></td>
                <td>{event.repeatGuests}%</td><td><ChevronRightIcon height="15" width="15" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing 5 of 12 events</span><a className="text-link" href="#events">View all events <ArrowRightIcon height="15" width="15" /></a></div>
    </Surface>
  );
}

function UpcomingEvents() {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-title">
      <div className="panel-heading"><h2 className="panel-title" id="upcoming-title">Upcoming events</h2><TactileButton className="compact-select">View all upcoming <ChevronDownIcon height="14" width="14" /></TactileButton></div>
      <div className="event-card-grid">
        {organizerOverviewData.upcoming.map((event) => (
          <Surface as="article" className="event-card" depth="inset" key={event.city}>
            <CityArtwork className="city-art--large" theme={event.theme} />
            <div className="event-card__body"><h3>{event.city}</h3><p>{event.name}</p><div className="event-meta"><span><CalendarIcon height="13" width="13" />{event.date}</span><span><PeopleIcon height="13" width="13" />{event.registered} registered</span><span><ShieldIcon height="13" width="13" />{event.daysToGo} days to go</span></div></div>
            <TactileButton aria-label={`Open ${event.city}`} iconOnly><ArrowRightIcon height="17" width="17" /></TactileButton>
          </Surface>
        ))}
      </div>
    </Surface>
  );
}

function ClosingSections() {
  const completed = organizerOverviewData.completed;
  return (
    <section className="closing-grid" aria-label="Recent network activity">
      <Surface as="article" className="panel" depth="raised">
        <div className="panel-heading"><div><h2 className="panel-title">The network is moving</h2><p className="panel-subtitle">Attendees traveling across cities. A growing, connected community.</p></div></div>
        <div className="movement-flow">
          {organizerOverviewData.movement.map((location, index) => (
            <div key={location.city} style={{ display: "contents" }}>
              <Surface className="movement-node" depth="inset"><CityArtwork className="city-art--small" theme={location.theme} /><div><strong>{location.city}</strong><span>{location.detail}</span></div><em><PeopleIcon height="15" width="15" />{location.signal}</em></Surface>
              {index < organizerOverviewData.movement.length - 1 ? <span className="movement-arrow"><ArrowRightIcon height="15" width="15" /></span> : null}
            </div>
          ))}
        </div>
      </Surface>
      <Surface as="article" className="panel" depth="raised">
        <div className="panel-heading"><h2 className="panel-title">Recently completed</h2><TactileButton className="compact-select">View all reports <ChevronDownIcon height="14" width="14" /></TactileButton></div>
        <Surface className="completed-card" depth="inset">
          <div aria-hidden="true" className="completed-art" />
          <div className="completed-copy"><h3>{completed.name}</h3><p>{completed.city} &nbsp;·&nbsp; {completed.date}</p><div className="completed-metrics"><div><strong>{completed.attendees}</strong><span>Attendees</span></div><div><strong>{completed.introductions}</strong><span>Introductions</span></div><div><strong>{completed.valuable}%</strong><span>Valuable</span></div></div></div>
          <ChevronRightIcon height="16" width="16" />
        </Surface>
      </Surface>
    </section>
  );
}

export function OrganizerOverview() {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="overview" />
        <main className="dashboard-main">
          <Topbar />
          <div className="content-stack">
            <Hero />
            <Metrics />
            <Analytics />
            <EventPerformanceTable />
            <UpcomingEvents />
            <ClosingSections />
            <footer className="dashboard-footer"><span>We Are One &nbsp;|&nbsp; Powered by Weft</span><span>People create what&apos;s next</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
