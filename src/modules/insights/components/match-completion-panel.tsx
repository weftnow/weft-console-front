"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { sendJson, toApplicationError } from "@/modules/attendees/mutations/api-error";
import { formatRelativeActivity } from "@/modules/events/event-record";
import { eventMatchKey } from "@/modules/network/queries/matches";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ApplicationError } from "@/shared/lib/application-error";
import { matchCompletionResponseSchema } from "../match-completion-schema";
import type { MatchCompletion } from "../outcomes-report";

type CompletionDraft = { completed: boolean; expectedRevision: number };

async function requestCompletion(url: string, init: RequestInit): Promise<MatchCompletion> {
  const { response, json } = await sendJson(fetch, url, init, "Could not reach the server.");
  if (!response.ok) throw toApplicationError(json, "Could not read the introduction outcome.");
  const result = matchCompletionResponseSchema.safeParse(json);
  if (!result.success) throw new ApplicationError("INTERNAL_ERROR", "The introduction outcome response was invalid.");
  return result.data.data.completion;
}

export function MatchCompletionPanel({ eventId, matchId, canConfirm }: { eventId: string; matchId: string; canConfirm: boolean }) {
  const i18n = useI18n();
  const copy = i18n.dict.network.matches.completion;
  const headingId = useId();
  const [draft, setDraft] = useState<CompletionDraft | null>(null);
  const client = useQueryClient();
  const queryKey = ["match-completion", eventId, matchId] as const;
  const url = `/api/events/${eventId}/matches/${matchId}/outcome`;
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => requestCompletion(url, { method: "GET", cache: "no-store", signal }),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (input: CompletionDraft) => {
      await client.cancelQueries({ queryKey });
      return requestCompletion(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    },
    onSuccess: (completion) => client.setQueryData(queryKey, completion),
    onSettled: () => setDraft(null),
  });
  const retry = async () => {
    setDraft(null);
    const [result] = await Promise.all([
      query.refetch(),
      client.invalidateQueries({ queryKey: eventMatchKey(eventId, matchId), exact: true }),
    ]);
    if (result.isSuccess) mutation.reset();
  };

  const completion = query.data;
  const recorded = completion?.completedAt != null;
  const saveDenied = mutation.error instanceof ApplicationError &&
    (mutation.error.code === "FORBIDDEN" || mutation.error.code === "NOT_FOUND" || mutation.error.code === "UNAUTHORIZED");
  const stale = mutation.error instanceof ApplicationError && mutation.error.code === "CONFLICT";
  const draftStale = draft !== null && draft.expectedRevision !== completion?.revision;
  let body;
  if (query.isFetching && (saveDenied || stale)) {
    body = <p role="status">{copy.loading}</p>;
  } else if (query.error instanceof ApplicationError && query.error.code === "NOT_FOUND") {
    body = <p>{copy.unavailable}</p>;
  } else if (query.isError || saveDenied) {
    body = <p role="alert">{copy.loadFailed} <button className="event-text-action" type="button" onClick={() => void retry()}>{copy.reload}</button></p>;
  } else if (!completion) {
    body = <p role="status">{copy.loading}</p>;
  } else if (!completion.trackingStartedAt) {
    body = <p>{copy.untracked} <Link className="text-link" href={`/outcomes?eventId=${eventId}`}>{copy.openOutcomes}</Link></p>;
  } else if (!recorded && !canConfirm) {
    body = <p>{copy.revoked}</p>;
  } else {
    body = <>
      <p role="status">{completion.completedAt ? i18n.t(copy.recorded, { when: formatRelativeActivity(i18n, completion.completedAt) }) : copy.unrecorded}</p>
      {mutation.isError || draftStale ? <p role="alert">
        {stale || draftStale ? copy.conflict : copy.saveFailed} <button className="event-text-action" type="button" onClick={() => void retry()}>{copy.reload}</button>
      </p> : null}
      {draft && !draftStale ? <p>{draft.completed ? copy.confirmPrompt : copy.removePrompt}</p> : null}
      {mutation.isError || draftStale ? null : <div className="match-completion__actions">
        <button className={`tactile-button tactile-button--${draft ? "primary" : "neutral"}`} type="button"
          disabled={mutation.isPending || query.isFetching}
          onClick={() => {
            if (draft) mutation.mutate(draft);
            else setDraft({ completed: !recorded, expectedRevision: completion.revision });
          }}>
          {mutation.isPending ? copy.saving : draft ? (draft.completed ? copy.record : copy.remove) : (recorded ? copy.correct : copy.confirm)}
        </button>
        {draft ? <button className="tactile-button tactile-button--neutral" type="button" disabled={mutation.isPending} onClick={() => setDraft(null)}>{copy.cancel}</button> : null}
      </div>}
    </>;
  }

  return <section className="match-completion" aria-labelledby={headingId}>
    <h3 id={headingId}>{copy.heading}</h3>
    {body}
  </section>;
}
