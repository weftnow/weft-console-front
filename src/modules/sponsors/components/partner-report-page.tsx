"use client";

import { useI18n } from "@/shared/i18n/I18nProvider";
import { EmptyState } from "@/shared/ui/empty-state";
import { OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

/**
 * Standalone partner report. It deliberately renders without the organizer
 * console navigation — a partner opens this as their own view of one event.
 */
export function PartnerReportPage() {
  const copy = useI18n().dict.sponsors.report;
  return (
    <div className="partner-shell">
      <main className="partner-main">
        <header className="events-header">
          <div className="events-header__copy">
            <h1 className="events-header__title">{copy.title}</h1>
          </div>
        </header>
        <Surface as="section" className="panel" depth="raised">
          <EmptyState description={copy.emptyDescription} icon={OutcomesIcon} title={copy.emptyTitle} />
        </Surface>
      </main>
    </div>
  );
}
