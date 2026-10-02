import { EmptyState } from "@/shared/ui/empty-state";
import { OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

/**
 * Standalone partner report. It deliberately renders without the organizer
 * console navigation — a partner opens this as their own view of one event.
 */
export function PartnerReportPage() {
  return (
    <div className="partner-shell">
      <main className="partner-main">
        <header className="events-header">
          <div className="events-header__copy">
            <h1 className="events-header__title">Partner report</h1>
          </div>
        </header>
        <Surface as="section" className="panel" depth="raised">
          <EmptyState description="Reports appear after a partner's event has outcomes." icon={OutcomesIcon} title="No partner report yet" />
        </Surface>
        <footer className="dashboard-footer"><span>Powered by Weft</span></footer>
      </main>
    </div>
  );
}
