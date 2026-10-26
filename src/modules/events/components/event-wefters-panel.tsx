"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { wefterAssignmentSchema, wefterListResponseSchema, wefterUpdateResponseSchema, type TimeInterval } from "../settings-schemas";
import { eventAccessUpdateResponseSchema, type EventAccessMode } from "../access-schemas";
import { describeIntervals, eventFormErrorSchema } from "../event-form";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { EmptyState } from "@/shared/ui/empty-state";
import { StaffIcon } from "@/shared/ui/icons";
import { EventField, EventIntervals } from "./event-form-controls";
import { useCanInviteStaff } from "./events-query-provider";

type StaffData = ReturnType<typeof wefterListResponseSchema.parse>["data"];
type Candidate = StaffData["candidates"][number];
type StaffDraft = { accessMode: EventAccessMode | null; windows: TimeInterval[]; revision: number };

function StaffMember({ eventId, member, schedule, timezone, refresh }: {
  eventId: string; member: Candidate; schedule?: StaffData["wefters"][number]; timezone: string; refresh: () => Promise<StaffData>;
}) {
  const i18n = useI18n();
  const { dict, t } = i18n;
  const copy = dict.events.staff;
  const accessLabel = (mode: EventAccessMode | null) => copy.access[mode ?? "none"];
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
      throw new Error(copy.errors.invalidHours);
    }
    const response = await fetch(`/api/events/${eventId}/${isWefter ? "wefters" : "access"}/${member.membershipId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isWefter ? { expectedRevision: draft.revision, assigned: true, availabilityWindows: draft.windows } : { expectedRevision: draft.revision, accessMode: draft.accessMode }),
    });
    const body: unknown = await response.json();
    if (response.status === 409) {
      const data = await refresh();
      const candidate = data.candidates.find((item) => item.membershipId === member.membershipId);
      if (!candidate) throw new Error(copy.errors.unavailable);
      setLatest({ accessMode: candidate.currentMode, revision: candidate.revision, windows: data.wefters.find((item) => item.membershipId === member.membershipId)?.availabilityWindows ?? [] });
      return;
    }
    if (!response.ok) {
      const parsed = eventFormErrorSchema.safeParse(body);
      throw new Error(parsed.success ? Object.values(parsed.data.error.fields ?? {}).join(" ") || parsed.data.error.message : copy.errors.saveFailed);
    }
    if (isWefter) wefterUpdateResponseSchema.parse(body); else eventAccessUpdateResponseSchema.parse(body);
    setDraft(null); setLatest(null); setNotice(copy.saved);
    await refresh();
  }, onError: (reason) => setError(reason.message) });

  return <li className="event-staff-member">
    <form onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <fieldset disabled={save.isPending}>
        <div className="event-staff-row"><div className="event-staff-identity"><span className="event-staff-avatar" aria-hidden="true">{member.memberName.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><h3>{member.memberName}</h3><p>{accessLabel(member.currentMode)}</p></div></div>
          <EventField label={t(copy.accessFor, { name: member.memberName })}>{(id) => <select className="event-control" id={id} value={current.accessMode ?? "none"} onChange={(event) => edit({ accessMode: event.target.value === "none" ? null : event.target.value as EventAccessMode })}><option value="none">{copy.access.none}</option><option value="operator">{copy.access.operator}</option><option value="wefter">{copy.access.wefter}</option></select>}</EventField>
        </div>
        <p className="event-staff-explanation">{copy.explanation[current.accessMode ?? "none"]}</p>
        {member.currentMode === "wefter" && current.accessMode !== "wefter" ? <p className="event-change-note">{current.accessMode === null ? copy.removesHoursAndAccess : copy.removesHours}</p> : member.currentMode === "operator" && current.accessMode === "wefter" ? <p className="event-change-note">{copy.removesRoster}</p> : null}
        {current.accessMode === "wefter" ? <div className="event-staff-hours"><h4>{copy.hoursHeading}</h4><p className="event-section-description">{t(copy.hoursDescription, { timezone: timezone.replaceAll("_", " ") })}</p><EventIntervals label={dict.events.form.hoursLabel} timezone={timezone} windows={current.windows} onChange={(windows) => edit({ windows })} /></div> : null}
      </fieldset>
      {latest ? <div className="event-conflict" role="alert"><h4>{copy.conflict.heading}</h4><p>{copy.conflict.description}</p><div className="event-comparison">{[{ title: copy.conflict.saved, value: latest }, { title: copy.conflict.yours, value: current }].map(({ title, value }) => <div key={title}><h4>{title}</h4><p>{accessLabel(value.accessMode)}</p>{value.accessMode === "wefter" ? <p>{describeIntervals(i18n, value.windows, timezone)}</p> : null}</div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { setDraft(null); setLatest(null); }}>{copy.conflict.useSaved}</TactileButton><TactileButton onClick={() => { setDraft({ ...current, revision: latest.revision }); setLatest(null); }}>{copy.conflict.keepMine}</TactileButton></div></div> : null}
      {error ? <p className="event-field__error" role="alert">{error}</p> : null}{notice ? <p className="event-form-notice" role="status">{notice}</p> : null}
      {draft ? <div className="event-form-footer"><span>{copy.unsaved}</span><div className="event-form-actions"><TactileButton disabled={save.isPending} onClick={() => { setDraft(null); setLatest(null); setError(""); }}>{copy.discard}</TactileButton><TactileButton disabled={save.isPending || !!latest} type="submit" variant="graphite">{save.isPending ? copy.saving : copy.save}</TactileButton></div></div> : null}
    </form>
  </li>;
}

export function EventWeftersPanel({ eventId, onSaved }: { eventId: string; onSaved: () => void | Promise<void> }) {
  const { dict } = useI18n();
  const copy = dict.events.staff;
  const canInvite = useCanInviteStaff();
  const query = useQuery({ queryKey: ["event-wefters", eventId], queryFn: async () => {
    const response = await fetch(`/api/events/${eventId}/wefters`, { cache: "no-store" });
    if (!response.ok) throw new Error(copy.errors.loadFailed);
    return wefterListResponseSchema.parse(await response.json()).data;
  }, staleTime: 0 });
  async function refresh() {
    const result = await query.refetch();
    if (!result.data || result.isError) throw new Error(copy.errors.refreshFailed);
    await onSaved();
    return result.data;
  }
  return <Surface as="section" className="panel event-management-panel" depth="raised" aria-labelledby="event-staff-heading">
    <div className="event-management-heading"><span className="event-management-icon surface-inset"><StaffIcon height="20" width="20" /></span><div><h2 id="event-staff-heading">{copy.heading}</h2><p>{copy.description}</p></div>{canInvite ? <Link className="event-text-action" href="/settings/team">{copy.manageTeam}</Link> : null}</div>
    {query.isError && query.data ? <p className="event-field__error" role="status">{copy.refreshFailedInline} <button className="event-text-action" onClick={() => void query.refetch()} type="button">{dict.common.actions.retry}</button></p> : null}
    {query.isPending ? <p className="event-form-notice" role="status">{copy.loading}</p> : !query.data ? <div className="event-form-section"><p role="alert">{copy.panelLoadFailed}</p><TactileButton onClick={() => void query.refetch()}>{dict.common.actions.retry}</TactileButton></div> : !query.data.candidates.length ? <EmptyState size="panel" icon={StaffIcon} title={copy.emptyTitle} description={canInvite ? copy.emptyOwner : copy.emptyOther} action={canInvite ? <Link className="tactile-button event-form-button" href="/settings/team">{copy.invite}</Link> : undefined} /> : <ul className="event-staff-list">{query.data.candidates.map((member) => <StaffMember key={member.membershipId} eventId={eventId} member={member} schedule={query.data.wefters.find((item) => item.membershipId === member.membershipId)} timezone={query.data.timezone} refresh={refresh} />)}</ul>}
  </Surface>;
}
