import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function PeoplePage({ context }: { context: ConsoleContext }) {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="people" context={context} />
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">People</h1>
              <p className="events-header__subtitle">Everyone who has attended your events.</p>
            </div>
          </header>
          <div className="content-stack">
            <Surface as="section" className="panel" depth="raised">
              <EmptyState description="Guests appear here once you add them to an event." icon={PeopleIcon} title="No people yet" />
            </Surface>
            <footer className="dashboard-footer"><span>Powered by Weft</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
