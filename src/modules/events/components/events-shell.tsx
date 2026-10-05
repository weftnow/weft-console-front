import type { ReactNode } from "react";

import type { ConsoleContext } from "@/modules/organizations/types";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";

export function EventsShell({ context, children }: { context: ConsoleContext; children: ReactNode }) {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="events" context={context} />
        {children}
      </div>
    </div>
  );
}
