"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Surface } from "@/shared/ui/surface";
import { ArrowLeftIcon } from "@/shared/ui/icons";

export function StaffEventShell({ name, venue, children }: { name: string; venue: string; children: ReactNode }) {
  const copy = useI18n().dict.wefter.shell;
  return <main className="staff-event-workspace"><header className="staff-event-header"><div className="staff-event-brand"><div className="brand-mark" aria-hidden="true"><span /></div><span>{copy.brand}</span></div><Link className="event-text-action" href="/select-organization"><ArrowLeftIcon height="15" width="15" /> {copy.yourEvents}</Link></header><div className="staff-event-title"><h1>{name}</h1>{venue ? <p>{venue}</p> : null}</div><Surface className="panel event-management-panel" depth="raised">{children}</Surface></main>;
}
