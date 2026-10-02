import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import { Surface } from "@/shared/ui/surface";

export function EventAccessState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="overview-shell event-detail-shell">
    <div className="dashboard-layout">
      <ConsoleSidebar active="events" />
      <main className="dashboard-main event-detail-main">
        <Surface className="event-detail-missing" depth="raised">
          <h1>{title}</h1>
          <p>{description}</p>
          {action}
          <Link className="tactile-button tactile-button--graphite event-detail-missing__action" href="/events">Back to events</Link>
        </Surface>
      </main>
    </div>
  </div>;
}
