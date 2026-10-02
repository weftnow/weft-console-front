import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/shared/ui/surface";

export function EventAccessState({ action, description, showBackLink = true, title }: {
  action?: ReactNode; description: string; showBackLink?: boolean; title: string;
}) {
  return <div className="overview-shell event-detail-shell">
      <main className="dashboard-main event-detail-main">
        <Surface className="event-detail-missing" depth="raised">
          <h1>{title}</h1>
          <p>{description}</p>
          {action}
          {showBackLink ? <Link className="tactile-button tactile-button--graphite event-detail-missing__action" href="/events">Back to events</Link> : null}
        </Surface>
      </main>
  </div>;
}
