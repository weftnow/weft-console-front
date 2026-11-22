"use client";

import { useI18n } from "@/shared/i18n/I18nProvider";
import { LoadingPlaceholder } from "@/shared/ui/loading";
import { Surface } from "@/shared/ui/surface";

export default function Loading() {
  const { dict } = useI18n();
  return (
    <main className="dashboard-main create-event-main">
      <LoadingPlaceholder label={dict.events.create.loading}>
        <header className="create-event-header create-skeleton-header">
          <span className="loading-skeleton create-skeleton-crumb" />
          <span className="loading-skeleton create-skeleton-title" />
          <span className="loading-skeleton create-skeleton-subtitle" />
        </header>
        <div className="create-event-layout create-skeleton-layout">
          <div className="create-event-form">
            <Surface className="create-section" depth="raised">
              <span className="loading-skeleton create-skeleton-heading" />
              <div className="event-basics-grid">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((field) => (
                  <div className="event-field" key={field}>
                    <span className="loading-skeleton create-skeleton-label" />
                    <span className="loading-skeleton create-skeleton-control" />
                  </div>
                ))}
              </div>
            </Surface>
            <Surface className="create-section" depth="raised">
              <span className="loading-skeleton create-skeleton-heading" />
              <span className="loading-skeleton create-skeleton-description" />
            </Surface>
          </div>
          <Surface className="event-summary-card create-skeleton-summary" depth="raised">
            <span className="loading-skeleton create-skeleton-heading" />
            <span className="loading-skeleton create-skeleton-cover" />
            <span className="loading-skeleton create-skeleton-control" />
          </Surface>
        </div>
      </LoadingPlaceholder>
    </main>
  );
}
