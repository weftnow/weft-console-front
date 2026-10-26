import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { groupEvents } from "../event-list";
import { EmptyState } from "@/shared/ui/empty-state";
import { CalendarIcon, PlusIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { AllEventsTable } from "./all-events-table";
import { LiveEventPanel } from "./live-event-panel";
import { RecentlyCompletedPanel } from "./recently-completed-panel";
import { UpcomingEventsPanel } from "./upcoming-events-panel";

const newEventLink = (label: string) => (
  <Link className="tactile-button tactile-button--primary new-event-action" href="/events/new">
    <PlusIcon height="16" width="16" /> {label}
  </Link>
);

export function EventsPage({ events }: { events: EventSummaryDto[] }) {
  const grouped = groupEvents(events);
  return (
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">Events</h1>
              <p className="events-header__subtitle">Every event your organization operates on Weft.</p>
            </div>
            {events.length > 0 ? <div className="events-header__actions">{newEventLink("New event")}</div> : null}
          </header>
          <div className="content-stack">
            {events.length === 0 ? (
              <Surface as="section" className="panel" depth="raised">
                <EmptyState
                  action={<Link className="tactile-button tactile-button--primary" href="/events/new">Create event</Link>}
                  description="Create your first event to start operating its networking experience."
                  icon={CalendarIcon}
                  title="No events yet"
                />
              </Surface>
            ) : (
              <>
                <LiveEventPanel event={grouped.live[0] ?? null} />
                <UpcomingEventsPanel events={grouped.upcoming.slice(0, 3)} />
                <AllEventsTable events={grouped.all} />
                <RecentlyCompletedPanel events={grouped.completed.slice(0, 3)} />
              </>
            )}
          </div>
        </main>
  );
}
