"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventAccessListSchema, eventAccessUpdateResponseSchema, type EventAccessDto, type EventAccessMode } from "../access-schemas";
import { Surface } from "@/shared/ui/surface";

type SaveInput = { saved: EventAccessDto; draft: EventAccessMode | null };
type SaveResult = { kind: "saved"; eventAccess: EventAccessDto } | { kind: "conflict"; current: EventAccessDto | null };
type EditConflict = { current: EventAccessDto | null; message: string };

async function fetchAccess(eventId: string): Promise<EventAccessDto[]> {
  const response = await fetch(`/api/events/${eventId}/access`, { cache: "no-store" });
  if (!response.ok) throw new Error("Access list unavailable.");
  return eventAccessListSchema.parse(await response.json()).data.eventAccess;
}

export function EventAccessPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, EventAccessMode | null>>({});
  const [conflicts, setConflicts] = useState<Record<string, EditConflict>>({});
  const queryKey = ["event-access", eventId];
  const query = useQuery({ queryKey, queryFn: () => fetchAccess(eventId), staleTime: 0 });
  const saveMutation = useMutation<SaveResult, Error, SaveInput>({
    mutationFn: async ({ saved, draft }) => {
      const response = await fetch(`/api/events/${eventId}/access/${saved.membershipId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessMode: draft, expectedRevision: saved.revision }),
      });
      const payload: unknown = await response.json();
      if (response.status === 409 && payload && typeof payload === "object" && "error" in payload) {
        const error = payload.error;
        const details = error && typeof error === "object" && "details" in error ? error.details : null;
        const latest = details && typeof details === "object" && "current" in details ? details.current : null;
        const parsed = latest ? eventAccessUpdateResponseSchema.shape.data.shape.eventAccess.safeParse(latest) : null;
        return { kind: "conflict", current: parsed?.success ? parsed.data : null };
      }
      if (!response.ok) throw new Error("The access change could not be saved.");
      return { kind: "saved", eventAccess: eventAccessUpdateResponseSchema.parse(payload).data.eventAccess };
    },
    onSuccess: (result, input) => {
      if (result.kind === "conflict") {
        setConflicts((current) => ({ ...current, [input.saved.membershipId]: {
          current: result.current,
          message: "This access changed while you were editing. Review the saved value, then choose a revision to retry.",
        } }));
        return;
      }
      queryClient.setQueryData<EventAccessDto[]>(queryKey, (current) => current?.map((item) => item.membershipId === result.eventAccess.membershipId ? result.eventAccess : item));
      setDrafts((current) => { const next = { ...current }; delete next[input.saved.membershipId]; return next; });
      setConflicts((current) => { const next = { ...current }; delete next[input.saved.membershipId]; return next; });
    },
  });

  function updateDraft(membershipId: string, draft: EventAccessMode | null) {
    setDrafts((current) => ({ ...current, [membershipId]: draft }));
  }

  return <Surface className="event-access-panel" depth="raised" aria-labelledby="event-access-heading">
    <h2 id="event-access-heading">Event access</h2>
    <p>Grant active staff access to this event. Operators can read the roster. Wefters receive restricted access and organizer-managed availability. Selecting Wefter replaces Operator mode for that event.</p>
    {query.isPending ? <p role="status">Loading staff access…</p> : null}
    {query.isError ? <div role="alert"><p>Staff access could not be loaded.</p><button type="button" onClick={() => void query.refetch()}>Try again</button></div> : null}
    {query.data && query.data.length === 0 ? <p>No active staff memberships are available in this organization.</p> : null}
    {query.data ? <ul className="grid gap-3">
      {query.data.map((saved) => {
        const draft = Object.hasOwn(drafts, saved.membershipId) ? drafts[saved.membershipId] : saved.accessMode;
        const conflict = conflicts[saved.membershipId];
        return <li className="rounded-xl border border-border p-4" key={saved.membershipId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><strong>{saved.memberName}</strong><p className="text-sm text-muted-foreground">Saved: {saved.accessMode ?? "No access"} · revision {saved.revision}</p></div>
            <label className="grid gap-1 text-sm">Access mode
              <select aria-label={`Access mode for ${saved.memberName}`} value={draft ?? "none"} onChange={(event) => updateDraft(saved.membershipId, event.target.value === "none" ? null : event.target.value as EventAccessMode)}>
                <option value="none">No access</option><option value="operator">Operator</option><option value="wefter">Wefter</option>
              </select>
            </label>
            <button className="tactile-button tactile-button--graphite" disabled={saveMutation.isPending || draft === saved.accessMode} onClick={() => saveMutation.mutate({ saved, draft })} type="button">{saveMutation.isPending && saveMutation.variables?.saved.membershipId === saved.membershipId ? "Saving…" : "Save access"}</button>
          </div>
          {conflict ? <div className="mt-3 rounded-lg border border-amber-500/40 p-3" role="alert">
            <p>{conflict.message}</p>
            <p className="mt-1 text-sm">Latest saved: {conflict.current?.accessMode ?? "No access"} · revision {conflict.current?.revision ?? "unavailable"}</p>
            {conflict.current ? <button className="mt-2 text-sm underline underline-offset-4" onClick={() => {
              queryClient.setQueryData<EventAccessDto[]>(queryKey, (current) => current?.map((item) => item.membershipId === saved.membershipId ? conflict.current! : item));
              setConflicts((current) => { const next = { ...current }; delete next[saved.membershipId]; return next; });
            }} type="button">Use latest revision and review draft</button> : null}
          </div> : null}
          {saveMutation.isError && saveMutation.variables?.saved.membershipId === saved.membershipId ? <p className="mt-3 text-sm" role="alert">Could not save event access. Try again.</p> : null}
        </li>;
      })}
    </ul> : null}
  </Surface>;
}
