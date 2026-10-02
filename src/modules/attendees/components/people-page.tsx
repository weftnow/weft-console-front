import type { ReactNode } from "react";

import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { DemoDataNotice } from "@/shared/ui/demo-data-notice";
import type { ConsoleContext } from "@/modules/organizations/types";
import { FilterMenu } from "@/shared/ui/filter-menu";
import {
  CalendarIcon,
  FilterIcon,
  OutcomesIcon,
  PeopleIcon,
  ReturnIcon,
  SearchIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { peopleData, type PeopleMetricIcon } from "../people-data";
import { PeopleDirectory } from "./people-directory";
import { PersonProfilePanel } from "./person-profile-panel";

const metricGlyphs: Record<PeopleMetricIcon, ReactNode> = {
  people: <PeopleIcon height="19" width="19" />,
  return: <ReturnIcon height="19" width="19" />,
  outcomes: <OutcomesIcon height="19" width="19" />,
  calendar: <CalendarIcon height="19" width="19" />,
};

function PeopleHeader() {
  return (
    <header className="people-header">
      <div className="people-header__copy">
        <h1>People</h1>
        <p>{peopleData.subtitle}</p>
      </div>
      <div className="people-header__controls">
        <FilterMenu
          label="All events"
          options={["All events", "F1 Week", "Art Week", "Founders Dinner"]}
        />
        <FilterMenu
          label="All cities"
          options={["All cities", "Las Vegas", "Singapore", "Abu Dhabi", "Miami"]}
        />
      </div>
    </header>
  );
}

function PeopleSearch() {
  return (
    <Surface className="people-search" depth="inset">
      <SearchIcon height="18" width="18" />
      <label className="visually-hidden" htmlFor="people-search">
        Search people, companies, roles, goals
      </label>
      <input
        id="people-search"
        placeholder="Search people, companies, roles, goals..."
        readOnly
        type="search"
      />
      <span aria-hidden="true" className="people-search__hint">
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </span>
    </Surface>
  );
}

function QuickFilters() {
  return (
    <div aria-label="Quick filters" className="people-filters" role="group">
      <div className="people-filters__group">
        {peopleData.quickFilters.map((filter, index) => {
          const active = index === 0;

          return (
            <TactileButton
              aria-pressed={active}
              className={`quick-filter ${active ? "quick-filter--active" : ""}`.trim()}
              key={filter}
            >
              {filter}
            </TactileButton>
          );
        })}
      </div>
      <TactileButton className="quick-filter quick-filter--more">
        <FilterIcon height="15" width="15" /> Filters
      </TactileButton>
    </div>
  );
}

function PeopleMetrics() {
  return (
    <section aria-label="People summary metrics" className="people-metrics">
      {peopleData.metrics.map((metric) => (
        <Surface as="article" className="people-metric" depth="raised" key={metric.label}>
          <Surface className="people-metric__icon" depth="inset">
            {metricGlyphs[metric.icon]}
          </Surface>
          <div className="people-metric__copy">
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
            {metric.description ? <small>{metric.description}</small> : null}
          </div>
        </Surface>
      ))}
    </section>
  );
}

export function PeoplePage({ context }: { context: ConsoleContext }) {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="people" context={context} />
        <main className="dashboard-main people-main">
          <DemoDataNotice />
          <div className="people-workspace">
            <div className="people-primary">
              <PeopleHeader />
              <div className="people-content-stack">
                <PeopleSearch />
                <QuickFilters />
                <PeopleMetrics />
                <PeopleDirectory />
              </div>
            </div>
            <PersonProfilePanel />
          </div>
          <footer className="dashboard-footer">
            <span>We Are One &nbsp;|&nbsp; Powered by Weft</span>
            <span>People create what&apos;s next</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
