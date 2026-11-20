"use client";

import Link from "next/link";

import { useI18n } from "@/shared/i18n/I18nProvider";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowLeftIcon, OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function OutcomesSkeleton() {
  const { dict } = useI18n();
  return (
    <main aria-busy="true" aria-label={dict.insights.outcomes.loading} className="dashboard-main outcomes-main">
      <div aria-hidden="true" className="outcomes-skeleton-header">
        <div className="outcomes-skeleton-header__copy">
          <span className="event-detail-skeleton outcomes-skeleton--kicker" />
          <span className="event-detail-skeleton outcomes-skeleton--title" />
          <span className="event-detail-skeleton outcomes-skeleton--subtitle" />
        </div>
        <span className="event-detail-skeleton outcomes-skeleton--filter" />
      </div>
      <div aria-hidden="true" className="content-stack">
        <div className="outcomes-metrics outcomes-metrics--summary">
          <div className="event-detail-skeleton outcomes-skeleton--metric" />
          <div className="event-detail-skeleton outcomes-skeleton--metric" />
        </div>
        <div className="event-detail-skeleton outcomes-skeleton--table" />
      </div>
    </main>
  );
}

export function OutcomesErrorState({ onRetry }: { onRetry: () => void }) {
  const { dict } = useI18n();
  const copy = dict.insights.outcomes.error;
  return (
    <main className="dashboard-main outcomes-main">
      <Surface as="section" className="panel outcomes-state-panel" depth="raised">
        <EmptyState
          action={
            <button className="tactile-button tactile-button--primary" onClick={onRetry} type="button">
              {dict.common.actions.retry}
            </button>
          }
          description={copy.description}
          icon={OutcomesIcon}
          title={copy.title}
        />
      </Surface>
    </main>
  );
}

export function OutcomesNotFoundState() {
  const { dict } = useI18n();
  const copy = dict.insights.outcomes.notFound;
  return (
    <main className="dashboard-main outcomes-main">
      <Surface as="section" className="panel outcomes-state-panel" depth="raised">
        <EmptyState
          action={
            <Link className="tactile-button tactile-button--graphite" href="/outcomes">
              <ArrowLeftIcon height="15" width="15" /> {copy.back}
            </Link>
          }
          description={copy.description}
          icon={OutcomesIcon}
          title={copy.title}
        />
      </Surface>
    </main>
  );
}
