"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { EventDetailTab } from "../event-record";
import { eventDetailQueryOptions, refreshEventDetail } from "../queries/event-detail-query";
import { useEndEventSession, useEventQueryScope } from "./events-query-provider";
import { EventDetailPage, MissingEvent } from "./event-detail-page";
import { EventDetailSkeleton } from "./event-detail-skeleton";
import { EventAccessState } from "./event-access-state";

function SignInRequired() {
  const { dict } = useI18n();
  const endSession = useEndEventSession();
  useEffect(() => {
    // Hide the entire protected scope before leaving it, including other cached events.
    endSession();
    window.location.replace("/sign-in");
  }, [endSession]);
  return <EventAccessState title={dict.events.detail.signInRequired} description={dict.events.detail.signInAgain} />;
}

export function EventDetailQueryPage({ eventId, initialTab }: { eventId: string; initialTab: EventDetailTab }) {
  const { dict } = useI18n();
  const copy = dict.events.detail;
  const scope = useEventQueryScope();
  const queryClient = useQueryClient();
  const query = useQuery(eventDetailQueryOptions(scope, eventId));
  const retry = <button className="tactile-button tactile-button--graphite" onClick={() => { void query.refetch(); }}>{dict.common.actions.retry}</button>;

  if (query.data?.kind === "unauthorized") return <SignInRequired />;
  if (query.data?.kind === "forbidden") return <EventAccessState title={copy.accessRequired} description={copy.noAccess} />;
  // API 404 UI cannot change the HTTP status of the already-rendered document.
  if (query.data?.kind === "not-found") return <MissingEvent />;
  if (query.data?.kind === "ready") {
    return <EventDetailPage
      event={query.data.event}
      initialTab={initialTab}
      key={eventId}
      onRosterChanged={() => refreshEventDetail(queryClient, scope, eventId)}
      refreshNotice={query.isError ? <div className="event-detail-refresh-notice" role="status"><span>{copy.refreshFailed}</span>{retry}</div> : undefined}
    />;
  }
  if (query.isPending) return <EventDetailSkeleton />;
  return <main className="dashboard-main event-detail-main">
    <section className="event-detail-missing" aria-labelledby="event-read-error">
      <h1 id="event-read-error">{copy.loadFailed}</h1>
      <p role="status">{copy.checkConnection}</p>
      {retry} <Link href="/events">{dict.events.access.back}</Link>
    </section>
  </main>;
}
