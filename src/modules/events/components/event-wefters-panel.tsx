"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { wefterAssignmentSchema, wefterListResponseSchema, wefterUpdateResponseSchema, type TimeInterval } from "../settings-schemas";
import { eventAccessUpdateResponseSchema, type EventAccessMode } from "../access-schemas";
import { describeIntervals, eventFormErrorSchema } from "../event-form";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { EmptyState } from "@/shared/ui/empty-state";
import { StaffIcon } from "@/shared/ui/icons";
import { EventField, EventIntervals } from "./event-form-controls";
import { useCanInviteStaff } from "./events-query-provider";

type StaffData = ReturnType<typeof wefterListResponseSchema.parse>["data"];
type Candidate = StaffData["candidates"][number];
type StaffDraft = { accessMode: EventAccessMode | null; windows: TimeInterval[]; revision: number };
const accessLabel = (mode: EventAccessMode | null) => mode === "wefter" ? "Wefter" : mode === "operator" ? "Roster access" : "No event access";

function StaffMember({ eventId, member, schedule, timezone, refresh }: {
  eventId: string; member: Candidate; schedule?: StaffData["wefters"][number]; timezone: string; refresh: () => Promise<StaffData>;
}) {
  const [draft, setDraft] = useState<StaffDraft | null>(null);
  const [latest, setLatest] = useState<StaffDraft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const saved: StaffDraft = { accessMode: member.currentMode, windows: schedule?.availabilityWindows ?? [], revision: member.revision };
  const current = draft ?? saved;
  const edit = (changes: Partial<StaffDraft>) => { setDraft({ ...current, ...changes }); setError(""); setNotice(""); };
  const save = useMutation({ mutationFn: async () => {
    if (!draft) return;
    const isWefter = draft.accessMode === "wefter";
    if (isWefter && !wefterAssignmentSchema.safeParse({ expectedRevision: draft.revision, assigned: true, availabilityWindows: draft.windows }).success) {
      throw new Error("Add a valid start and end for each set of hours.");
    }
    const response = await fetch(`/api/events/${eventId}/${isWefter ? "wefters" : "access"}/${member.membershipId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isWefter ? { expectedRevision: draft.revision, assigned: true, availabilityWindows: draft.windows } : { expectedRevision: draft.revision, accessMode: draft.accessMode }),
    });
    const body: unknown = await response.json();
    if (response.status === 409) {
      const data = await refresh();
      const candidate = data.candidates.find((item) => item.membershipId === member.membershipId);
      if (!candidate) throw new Error("This person is no longer available to add. Your changes were not saved.");
      setLatest({ accessMode: candidate.currentMode, revision: candidate.revision, windows: data.wefters.find((item) => item.membershipId === member.membershipId)?.availabilityWindows ?? [] });
      return;
    }
    if (!response.ok) {
      const parsed = eventFormErrorSchema.safeParse(body);
      throw new Error(parsed.success ? Object.values(parsed.data.error.fields ?? {}).join(" ") || parsed.data.error.message : "Could not save staff changes. Try again.");
    }
    if (isWefter) wefterUpdateResponseSchema.parse(body); else eventAccessUpdateResponseSchema.parse(body);
    setDraft(null); setLatest(null); setNotice("Staff details saved.");
    await refresh();
  }, onError: (reason) => setError(reason.message) });

  return <li className="event-staff-member">
    <form onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <fieldset disabled={save.isPending}>
        <div className="event-staff-row"><div className="event-staff-identity"><span className="event-staff-avatar" aria-hidden="true">{member.memberName.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><h3>{member.memberName}</h3><p>{accessLabel(member.currentMode)}</p></div></div>
          <EventField label={`Event access for ${member.memberName}`}>{(id) => <select className="event-control" id={id} value={current.accessMode ?? "none"} onChange={(event) => edit({ accessMode: event.target.value === "none" ? null : event.target.value as EventAccessMode })}><option value="none">No event access</option><option value="operator">Roster access</option><option value="wefter">Wefter</option></select>}</EventField>
        </div>
        <p className="event-staff-explanation">{current.accessMode === "wefter" ? "Wefters can view their own availability hours. They do not have access to the attendee roster." : current.accessMode === "operator" ? "Can view this event’s attendee roster. Cannot edit attendees or event settings." : "This person cannot open the event."}</p>
        {member.currentMode === "wefter" && current.accessMode !== "wefter" ? <p className="event-change-note">Saving this change removes their Wefter hours{current.accessMode === null ? " and access to this event" : ""}.</p> : member.currentMode === "operator" && current.accessMode === "wefter" ? <p className="event-change-note">Saving as a Wefter removes their roster access.</p> : null}
        {current.accessMode === "wefter" ? <div className="event-staff-hours"><h4>Availability hours</h4><p className="event-section-description">Set by the event organizers. Times use {timezone.replaceAll("_", " ")}.</p><EventIntervals label="hours" timezone={timezone} windows={current.windows} onChange={(windows) => edit({ windows })} /></div> : null}
      </fieldset>
      {latest ? <div className="event-conflict" role="alert"><h4>Staff details changed while you were editing</h4><p>Compare the saved details with your changes before saving again.</p><div className="event-comparison">{[{ title: "Saved details", value: latest }, { title: "Your changes", value: current }].map(({ title, value }) => <div key={title}><h4>{title}</h4><p>{accessLabel(value.accessMode)}</p>{value.accessMode === "wefter" ? <p>{describeIntervals(value.windows, timezone)}</p> : null}</div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { setDraft(null); setLatest(null); }}>Use saved details</TactileButton><TactileButton onClick={() => { setDraft({ ...current, revision: latest.revision }); setLatest(null); }}>Keep my changes</TactileButton></div></div> : null}
      {error ? <p className="event-field__error" role="alert">{error}</p> : null}{notice ? <p className="event-form-notice" role="status">{notice}</p> : null}
      {draft ? <div className="event-form-footer"><span>Unsaved changes</span><div className="event-form-actions"><TactileButton disabled={save.isPending} onClick={() => { setDraft(null); setLatest(null); setError(""); }}>Discard changes</TactileButton><TactileButton disabled={save.isPending || !!latest} type="submit" variant="graphite">{save.isPending ? "Saving…" : "Save staff details"}</TactileButton></div></div> : null}
    </form>
  </li>;
}

export function EventWeftersPanel({ eventId, onSaved }: { eventId: string; onSaved: () => void | Promise<void> }) {
  const canInvite = useCanInviteStaff();
  const query = useQuery({ queryKey: ["event-wefters", eventId], queryFn: async () => {
    const response = await fetch(`/api/events/${eventId}/wefters`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load staff.");
    return wefterListResponseSchema.parse(await response.json()).data;
  }, staleTime: 0 });
  async function refresh() {
    const result = await query.refetch();
    if (!result.data || result.isError) throw new Error("Could not refresh staff details. Reload the page before saving again.");
    await onSaved();
    return result.data;
  }
  return <Surface as="section" className="panel event-management-panel" depth="raised" aria-labelledby="event-staff-heading">
    <div className="event-management-heading"><span className="event-management-icon surface-inset"><StaffIcon height="20" width="20" /></span><div><h2 id="event-staff-heading">Event staff</h2><p>Manage roster access, Wefters and their availability hours.</p></div>{canInvite ? <Link className="event-text-action" href="/settings/team">Manage team</Link> : null}</div>
    {query.isError && query.data ? <p className="event-field__error" role="status">Could not refresh staff. Your changes are still here. <button className="event-text-action" onClick={() => void query.refetch()} type="button">Try again</button></p> : null}
    {query.isPending ? <p className="event-form-notice" role="status">Loading staff…</p> : !query.data ? <div className="event-form-section"><p role="alert">Could not load event staff.</p><TactileButton onClick={() => void query.refetch()}>Try again</TactileButton></div> : !query.data.candidates.length ? <EmptyState size="panel" icon={StaffIcon} title="No staff to add yet" description={canInvite ? "Invite staff to your organization, then give them access to this event." : "Ask an organization owner to invite staff. You can then give them access to this event."} action={canInvite ? <Link className="tactile-button event-form-button" href="/settings/team">Invite staff</Link> : undefined} /> : <ul className="event-staff-list">{query.data.candidates.map((member) => <StaffMember key={member.membershipId} eventId={eventId} member={member} schedule={query.data.wefters.find((item) => item.membershipId === member.membershipId)} timezone={query.data.timezone} refresh={refresh} />)}</ul>}
  </Surface>;
}
