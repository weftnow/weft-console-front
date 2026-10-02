import Image from "next/image";
import type { ReactNode } from "react";

import { CityArtwork } from "@/shared/ui/city-artwork";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { DemoDataNotice } from "@/shared/ui/demo-data-notice";
import type { ConsoleContext } from "@/modules/organizations/types";
import {
  ArrowRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  NetworkIcon,
  OutcomesIcon,
  PeopleIcon,
  ReturnIcon,
  SearchIcon,
  ShieldIcon,
  SparklesIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import {
  networkPageData,
  type ConnectionRecommendation,
  type NetworkMetricIcon,
  type NetworkPerson,
  type ReturningEvent,
} from "../network-data";

function MetricGlyph({ icon }: { icon: NetworkMetricIcon }) {
  const icons: Record<NetworkMetricIcon, ReactNode> = {
    people: <PeopleIcon />,
    network: <NetworkIcon />,
    quality: <OutcomesIcon />,
    return: <ReturnIcon />,
  };

  return icons[icon];
}

function PersonPortrait({ person, size }: { person: NetworkPerson; size: number }) {
  return (
    <Image
      alt={person.avatarAlt}
      className="network-person__image"
      height={size}
      sizes={`${size}px`}
      src={person.avatar}
      width={size}
    />
  );
}

function RecommendationPerson({ person }: { person: NetworkPerson }) {
  return (
    <div className="recommendation-person">
      <PersonPortrait person={person} size={72} />
      <div className="recommendation-person__copy">
        <h3>{person.name}</h3>
        <p>{person.role}</p>
        <span>{person.company}</span>
      </div>
      <span className="person-tag">{person.category}</span>
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: ConnectionRecommendation }) {
  const [firstPerson, secondPerson] = recommendation.people;

  return (
    <Surface as="article" className="recommendation-card" depth="inset">
      <span className="match-chip">{recommendation.match}% match</span>
      <div className="recommendation-pair">
        <RecommendationPerson person={firstPerson} />
        <Surface className="pair-connector" depth="floating" aria-hidden="true">
          <CloseIcon height="16" width="16" />
        </Surface>
        <RecommendationPerson person={secondPerson} />
      </div>
      <div className="recommendation-reason">
        <h4>Why they should meet</h4>
        <p>{recommendation.reason}</p>
      </div>
      <div className="recommendation-footer">
        <div className="recommendation-state">
          <span><CalendarIcon height="15" width="15" />Both attending<br /><strong>{recommendation.event}</strong></span>
          <span><NetworkIcon height="15" width="15" />{recommendation.status}</span>
        </div>
        <TactileButton className="plan-introduction" variant="accent">
          Plan introduction <ArrowRightIcon height="15" width="15" />
        </TactileButton>
      </div>
    </Surface>
  );
}

function SectionHeading({
  icon,
  id,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  id?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="network-section-heading">
      <span className="network-section-icon" aria-hidden="true">{icon}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="network-section-action">{action}</div> : null}
    </div>
  );
}

function DirectPerson({ person, position }: { person: NetworkPerson; position: string }) {
  return (
    <Surface className={`direct-person direct-person--${position}`} depth="floating">
      <PersonPortrait person={person} size={42} />
      <span><strong>{person.name}</strong><small>{person.role} · {person.company}</small></span>
    </Surface>
  );
}

function NetworkExplorer() {
  const { connections, selected, summary } = networkPageData.explorer;

  return (
    <Surface as="section" className="network-panel network-explorer" depth="raised" aria-labelledby="network-explorer-title">
      <SectionHeading
        icon={<SearchIcon height="23" width="23" />}
        id="network-explorer-title"
        title="Network explorer"
        subtitle="Explore a person’s direct Weft network"
      />
      <Surface className="person-selector" depth="inset">
        <SearchIcon height="18" width="18" />
        <span>{selected.name}</span>
        <span className="selector-clear" aria-hidden="true"><CloseIcon height="13" width="13" /></span>
      </Surface>
      <div className="direct-network">
        <svg className="direct-network__lines" viewBox="0 0 720 275" aria-hidden="true">
          <path d="M338 139C285 139 285 58 212 58" />
          <path d="M338 139C285 139 285 219 212 219" />
          <path d="M382 139C435 139 435 58 508 58" />
          <path d="M382 139C435 139 435 219 508 219" />
        </svg>
        {connections.map(({ person, position }) => <DirectPerson key={person.id} person={person} position={position} />)}
        <div className="selected-person">
          <Surface className="selected-person__portrait" depth="floating">
            <PersonPortrait person={selected} size={84} />
          </Surface>
          <strong>{selected.name}</strong>
          <span>{selected.role} · {selected.company}</span>
          <em>{selected.category}</em>
        </div>
      </div>
      <Surface className="network-summary" depth="inset">
        <div><span className="summary-glyph"><NetworkIcon height="18" width="18" /></span><strong>{summary.introductions}</strong><small>Introductions</small></div>
        <div><span className="summary-glyph"><CalendarIcon height="18" width="18" /></span><strong>{summary.eventsTogether}</strong><small>Events together</small></div>
        <div><span className="summary-glyph"><ShieldIcon height="18" width="18" /></span><strong>{summary.lastEvent}</strong><small>Last event together</small></div>
      </Surface>
    </Surface>
  );
}

function NetworkComposition() {
  return (
    <Surface as="section" className="network-panel composition-panel" depth="raised" aria-labelledby="network-composition-title">
      <SectionHeading
        icon={<PeopleIcon height="22" width="22" />}
        id="network-composition-title"
        title="Network composition"
        subtitle="Breakdown of people in the We Are One ecosystem"
      />
      <div className="composition-layout">
        <div className="composition-donut" role="img" aria-label="Network composition donut chart">
          <div><strong>1,842</strong><span>People</span></div>
        </div>
        <ul className="composition-legend">
          {networkPageData.composition.map((item) => (
            <li key={item.label}>
              <span className={`composition-dot composition-dot--${item.tone}`} />
              <span>{item.label}</span>
              <strong>{item.percentage}%</strong>
              <small>({item.count})</small>
            </li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}

function IntroductionTypes() {
  return (
    <Surface as="section" className="network-panel introduction-types" depth="raised" aria-labelledby="introduction-types-title">
      <SectionHeading
        icon={<NetworkIcon height="22" width="22" />}
        id="introduction-types-title"
        title="Most common introduction types"
        subtitle="Actual introductions made through Weft"
        action={<TactileButton className="mini-view-all">View all</TactileButton>}
      />
      <div className="introduction-type-list">
        {networkPageData.introductionTypes.map((item) => (
          <div className="introduction-type" key={item.label}>
            <span>{item.label}</span>
            <span className="introduction-progress"><i style={{ width: `${item.progress}%` }} /></span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function EventArtwork({ event }: { event: ReturningEvent }) {
  return <CityArtwork art={event.theme} className="returning-event-art" />;
}

function ReturningAttendees() {
  return (
    <Surface as="section" className="network-panel returning-attendees" depth="raised" aria-labelledby="returning-attendees-title">
      <SectionHeading
        icon={<ReturnIcon height="23" width="23" />}
        id="returning-attendees-title"
        title="Returning attendees"
        subtitle="People who came back to the same event"
        action={<TactileButton className="mini-view-all">View all <ArrowRightIcon height="14" width="14" /></TactileButton>}
      />
      <div className="returning-table-scroll">
        <table className="returning-table">
          <thead><tr><th>Event</th><th>Total attendees</th><th>Returning attendees</th><th>Return rate</th></tr></thead>
          <tbody>
            {networkPageData.returningEvents.map((event) => (
              <tr key={event.name}>
                <td><div className="returning-event"><EventArtwork event={event} /><strong>{event.name}</strong></div></td>
                <td>{event.totalAttendees}</td>
                <td>{event.returningAttendees}</td>
                <td><div className="return-rate"><strong>{event.returnRate}%</strong><span><i style={{ width: `${event.returnRate * 2.4}%` }} /></span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function NetworkPage({ context }: { context: ConsoleContext }) {
  return (
    <div className="overview-shell network-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="network" context={context} />
        <main className="dashboard-main network-main">
          <DemoDataNotice />
          <header className="network-header">
            <div className="network-header__copy">
              <p>Network</p>
              <h1>The We Are One Network</h1>
              <span>People, introductions and opportunities across every event</span>
            </div>
            <div className="network-header__controls">
              <TactileButton>All time <ChevronDownIcon height="14" width="14" /></TactileButton>
              <TactileButton>All events <ChevronDownIcon height="14" width="14" /></TactileButton>
              <Surface className="network-search" depth="inset">
                <SearchIcon height="18" width="18" />
                <label className="visually-hidden" htmlFor="network-search">Search people, companies, or roles</label>
                <input id="network-search" placeholder="Search people, companies, or roles…" readOnly type="search" />
              </Surface>
            </div>
          </header>

          <div className="network-content-stack">
            <section className="network-metrics" aria-label="Network summary metrics">
              {networkPageData.metrics.map((metric) => (
                <Surface as="article" className="network-metric" depth="raised" key={metric.label}>
                  <Surface className="network-metric__icon" depth="inset"><MetricGlyph icon={metric.icon} /></Surface>
                  <div><strong>{metric.value}</strong><span>{metric.label}</span><small>{metric.description}</small></div>
                </Surface>
              ))}
            </section>

            <Surface as="section" className="recommendations-section" depth="raised" aria-labelledby="recommendations-title">
              <SectionHeading
                icon={<SparklesIcon height="25" width="25" />}
                id="recommendations-title"
                title="People who should meet"
                subtitle="High potential introductions based on your network"
                action={
                  <div className="recommendation-actions">
                    <TactileButton>View all <ArrowRightIcon height="14" width="14" /></TactileButton>
                    <TactileButton aria-label="Previous recommendations" iconOnly><ChevronRightIcon className="rotate-180" height="15" width="15" /></TactileButton>
                    <TactileButton aria-label="Next recommendations" iconOnly><ChevronRightIcon height="15" width="15" /></TactileButton>
                  </div>
                }
              />
              <div className="recommendation-grid">
                {networkPageData.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)}
              </div>
            </Surface>

            <div className="network-analysis-grid">
              <NetworkExplorer />
              <div className="network-insight-stack">
                <NetworkComposition />
                <IntroductionTypes />
              </div>
            </div>

            <ReturningAttendees />
            <footer className="dashboard-footer"><span>We Are One &nbsp;|&nbsp; Powered by Weft</span><span>People create what&apos;s next</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
