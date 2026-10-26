import Link from "next/link";
import type { ReactNode } from "react";
import { Surface } from "@/shared/ui/surface";
import { ArrowLeftIcon } from "@/shared/ui/icons";

export function StaffEventShell({ name, venue, children }: { name: string; venue: string; children: ReactNode }) {
  return <main className="staff-event-workspace"><header className="staff-event-header"><div className="staff-event-brand"><div className="brand-mark" aria-hidden="true"><span /></div><span>Weft Console</span></div><Link className="event-text-action" href="/select-organization"><ArrowLeftIcon height="15" width="15" /> Your events</Link></header><div className="staff-event-title"><h1>{name}</h1>{venue ? <p>{venue}</p> : null}</div><Surface className="panel event-management-panel" depth="raised">{children}</Surface></main>;
}
