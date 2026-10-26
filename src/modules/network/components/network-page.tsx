import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { NetworkIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function NetworkPage({ context }: { context: ConsoleContext }) {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="network" context={context} />
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">Network</h1>
              <p className="events-header__subtitle">How the people at your events connect.</p>
            </div>
          </header>
          <div className="content-stack">
            <Surface as="section" className="panel" depth="raised">
              <EmptyState description="It builds as introductions happen at your events." icon={NetworkIcon} title="Your network starts here" />
            </Surface>
          </div>
        </main>
      </div>
    </div>
  );
}
