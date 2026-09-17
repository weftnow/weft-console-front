import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { FilterMenu } from "@/shared/ui/filter-menu";
import { PlusIcon, SearchIcon } from "@/shared/ui/icons";
import { TactileButton } from "@/shared/ui/tactile-button";
import { AllEventsTable } from "./all-events-table";
import { LiveEventPanel } from "./live-event-panel";
import { RecentlyCompletedPanel } from "./recently-completed-panel";
import { UpcomingEventsPanel } from "./upcoming-events-panel";

function EventsHeader() {
  return (
    <header className="events-header">
      <div className="events-header__copy">
        <p className="eyebrow-line">We Are One</p>
        <h1 className="events-header__title">Events</h1>
        <p className="events-header__subtitle">All We Are One experiences across cities.</p>
      </div>
      <div className="events-header__actions">
        <label className="search-field">
          <SearchIcon height="16" width="16" />
          <input aria-label="Search events" placeholder="Search events…" type="search" />
        </label>
        <FilterMenu label="Status" options={["All statuses", "Live", "Upcoming", "Completed"]} />
        <FilterMenu label="City" options={["All cities", "Las Vegas", "Singapore", "Abu Dhabi", "Aspen"]} />
        <TactileButton className="new-event-action" variant="primary">
          <PlusIcon height="16" width="16" /> New event
        </TactileButton>
      </div>
    </header>
  );
}

export function EventsPage() {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="events" />
        <main className="dashboard-main">
          <EventsHeader />
          <div className="content-stack">
            <LiveEventPanel />
            <UpcomingEventsPanel />
            <AllEventsTable />
            <RecentlyCompletedPanel />
            <footer className="dashboard-footer">
              <span>We Are One &nbsp;|&nbsp; Powered by Weft</span>
              <span>People create what&apos;s next</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
