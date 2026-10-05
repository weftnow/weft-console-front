"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { EventDetailTab } from "../event-record";
import { eventDetailQueryOptions, refreshEventDetail } from "../queries/event-detail-query";
import { useEndEventSession, useEventQueryScope } from "./events-query-provider";
import { EventDetailPage, MissingEvent } from "./event-detail-page";
import { EventDetailSkeleton } from "./event-detail-skeleton";
import { EventAccessState } from "./event-access-state";

function SignInRequired() {
  const endSession = useEndEventSession();
  useEffect(() => {
    // Hide the entire protected scope before leaving it, including other cached events.
    endSession();
    window.location.replace("/sign-in");
  }, [endSession]);
  return <EventAccessState title="Sign in required" description="Sign in again to view this event." />;
}

export function EventDetailQueryPage({ eventId, initialTab }: { eventId: string; initialTab: EventDetailTab }) {
  const scope = useEventQueryScope();
  const queryClient = useQueryClient();
  const query = useQuery(eventDetailQueryOptions(scope, eventId));
  const retry = <button className="tactile-button tactile-button--graphite" onClick={() => { void query.refetch(); }}>Try again</button>;

  if (query.data?.kind === "unauthorized") return <SignInRequired />;
  if (query.data?.kind === "forbidden") return <EventAccessState title="Access required" description="You do not have access to this event." />;
  // API 404 UI cannot change the HTTP status of the already-rendered document.
  if (query.data?.kind === "not-found") return <MissingEvent />;
  if (query.data?.kind === "ready") {
    return <EventDetailPage
      event={query.data.event}
      initialTab={initialTab}
      key={eventId}
      onImportSaved={() => refreshEventDetail(queryClient, scope, eventId)}
      refreshNotice={query.isError ? <div className="event-detail-refresh-notice" role="status"><span>Could not refresh event. Showing the last loaded details.</span>{retry}</div> : undefined}
    />;
  }
  if (query.isPending) return <EventDetailSkeleton />;
  return <main className="dashboard-main event-detail-main">
    <section className="event-detail-missing" aria-labelledby="event-read-error">
      <h1 id="event-read-error">Could not load event</h1>
      <p role="status">Check your connection and try again.</p>
      {retry} <Link href="/events">Back to events</Link>
    </section>
  </main>;
}
