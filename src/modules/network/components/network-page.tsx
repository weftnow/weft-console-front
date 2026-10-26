"use client";

import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { EmptyState } from "@/shared/ui/empty-state";
import { NetworkIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function NetworkPage({ context }: { context: ConsoleContext }) {
  const copy = useI18n().dict.network.page;
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="network" context={context} />
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">{copy.title}</h1>
              <p className="events-header__subtitle">{copy.subtitle}</p>
            </div>
          </header>
          <div className="content-stack">
            <Surface as="section" className="panel" depth="raised">
              <EmptyState description={copy.emptyDescription} icon={NetworkIcon} title={copy.emptyTitle} />
            </Surface>
          </div>
        </main>
      </div>
    </div>
  );
}
