"use client";

import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { formatRelativeActivity } from "@/modules/events/event-record";
import { fetchEventMatchingStatus } from "../queries/matching-status";
import { describeMatchingStatus } from "../matching-status-copy";
import type { MatchingStatusResult } from "../matching-status-schemas";

const unavailableCopy = {
  not_configured: "Matching status isn’t connected in this environment yet.",
  unreachable: "The matching service didn’t respond. Try again in a moment.",
  invalid_response: "The matching service sent an answer this page couldn’t read.",
} as const;

export type MatchingStatusViewProps =
  | { kind: "loading" }
  | { kind: "error"; onRetry: () => void }
  | { kind: "result"; result: MatchingStatusResult; onRetry: () => void };

/** Read-only: it reports the matching state and has no way to start, stop or approve matching. */
export function MatchingStatusView(props: MatchingStatusViewProps) {
  const unavailableMessage = props.kind === "error"
    ? "Matching status couldn’t be loaded."
    : props.kind === "result" && props.result.availability === "unavailable" ? unavailableCopy[props.result.reason] : null;
  let body;
  if (props.kind === "loading") {
    body = <p className="matching-status__detail">Checking matching status…</p>;
  } else if (unavailableMessage !== null) {
    body = (
      <>
        <p className="matching-status__detail">{unavailableMessage}</p>
        <button className="event-text-action" onClick={props.onRetry} type="button">Check again</button>
      </>
    );
  } else if (props.kind === "result" && props.result.availability === "available") {
    const copy = describeMatchingStatus(props.result.status, formatRelativeActivity);
    body = (
      <>
        <span className={`status-pill matching-status__pill matching-status__pill--${copy.tone}`}>{copy.label}</span>
        <p className="matching-status__detail">{copy.detail}</p>
        {copy.source ? <p className="matching-status__source">{copy.source}</p> : null}
      </>
    );
  }
  return (
    <Surface as="section" className="event-detail-panel matching-status" depth="raised" aria-labelledby="matching-status-title">
      <div className="event-detail-panel__heading">
        <ClockIcon height="20" width="20" />
        <h2 id="matching-status-title">Matching status</h2>
      </div>
      <div aria-live="polite" className="matching-status__body">{body}</div>
    </Surface>
  );
}

const ACTIVE_REFRESH_MS = 5_000;
const IDLE_REFRESH_MS = 30_000;

export function MatchingStatusPanel({ eventId }: { eventId: string }) {
  const query = useQuery({
    queryKey: ["matching-status", eventId],
    queryFn: () => fetchEventMatchingStatus(eventId),
    refetchInterval: (current) => {
      const data = current.state.data;
      return data?.availability === "available" && (data.status.state === "waiting" || data.status.state === "running")
        ? ACTIVE_REFRESH_MS : IDLE_REFRESH_MS;
    },
    retry: false,
  });
  const retry = () => void query.refetch();
  if (query.data) return <MatchingStatusView kind="result" onRetry={retry} result={query.data} />;
  if (query.isError) return <MatchingStatusView kind="error" onRetry={retry} />;
  return <MatchingStatusView kind="loading" />;
}
