"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { SavedEventGuestRecord, EventGuestType } from "../event-record";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { attendeeCandidateResponseSchema, attendeeReplacementSchema } from "../attendee-record-schemas";
import { eventFormErrorSchema } from "../event-form";
import { savedEventGuestDtoSchema } from "../event-dto";
import { EventField } from "./event-form-controls";
import { ChevronDownIcon } from "@/shared/ui/icons";

type Draft = { firstName: string; lastName: string; email: string; phone: string; company: string; position: string; profileType: string; guestType: EventGuestType; linkedin: string };
type Candidate = ReturnType<typeof attendeeCandidateResponseSchema.parse>["data"]["candidates"][number];
const fields = [
  ["firstName", 100], ["lastName", 100], ["email", 254], ["phone", 40],
  ["company", 200], ["position", 200], ["profileType", 100], ["linkedin", 500],
] as const;
function guestDraft(guest: Draft): Draft {
  return { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone, company: guest.company, position: guest.position, profileType: guest.profileType, guestType: guest.guestType, linkedin: guest.linkedin };
}

export function AttendeeRecordActions({ eventId, guest, guests, canManage, onSaved, onEditProfile, onNetworking }: {
  eventId: string; guest: SavedEventGuestRecord; guests: SavedEventGuestRecord[]; canManage: boolean; onSaved: () => void | Promise<void>;
  onEditProfile: () => void; onNetworking: () => void;
}) {
  const { dict, t, plural } = useI18n();
  const copy = dict.events.record;
  const name = (person: { firstName: string; lastName: string }) => [person.firstName, person.lastName].filter(Boolean).join(" ") || copy.unnamed;
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const placeMenu = useCallback(() => {
    if (!menu.current?.matches(":popover-open") || !trigger.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const { width, height } = menu.current.getBoundingClientRect();
    menu.current.style.left = `${Math.max(12, Math.min(anchor.right - width, window.innerWidth - width - 12))}px`;
    menu.current.style.top = `${anchor.bottom + height + 8 < window.innerHeight - 12 ? anchor.bottom + 8 : Math.max(12, anchor.top - height - 8)}px`;
  }, []);
  useEffect(() => {
    window.addEventListener("resize", placeMenu);
    document.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      document.removeEventListener("scroll", placeMenu, true);
    };
  }, [placeMenu]);
  const runAction = (action: () => void) => {
    menu.current?.hidePopover();
    // Dialogs return focus to a visible row control rather than a hidden popover item.
    trigger.current?.focus();
    action();
  };
  const [view, setView] = useState<"edit" | "duplicates" | null>(null);
  const [draft, setDraft] = useState(guestDraft(guest));
  const [revision, setRevision] = useState(guest.revision);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<Omit<SavedEventGuestRecord, "networking" | "profile"> | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const linked = guests.filter((item) => item.personId === guest.personId && item.id !== guest.id);

  const loadCandidates = async () => {
    setError(""); setCandidates(null); setSelected(null); setConfirmed(false); setPending(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendees/${guest.id}`, { cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(copy.errors.duplicatesCheck);
      setCandidates(attendeeCandidateResponseSchema.parse(body).data.candidates);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.errors.duplicatesShort); }
    finally { setPending(false); }
  };
  const save = async () => {
    setError(""); setFieldErrors({});
    const parsed = attendeeReplacementSchema.safeParse({ ...draft, expectedRevision: revision });
    if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    setPending(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendees/${guest.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const parsedError = eventFormErrorSchema.safeParse(body);
        if (response.status === 409 && parsedError.success) {
          const snapshot = savedEventGuestDtoSchema.safeParse(parsedError.data.error.details?.current);
          if (snapshot.success) { setCurrent(snapshot.data); return; }
        }
        if (parsedError.success) setFieldErrors(parsedError.data.error.fields ?? {});
        throw new Error(parsedError.success ? parsedError.data.error.message : copy.errors.saveFailed);
      }
      setView(null); setNotice(copy.saved);
      try { await onSaved(); } catch { setNotice(copy.savedReload); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.errors.saveShort); }
    finally { setPending(false); }
  };
  const link = async () => {
    if (!selected || !confirmed) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/attendee-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateGuestId: guest.id, canonicalGuestId: selected.guestId }) });
      if (!response.ok) throw new Error(response.status === 409 ? copy.errors.linkStale : copy.errors.linkFailed);
      setView(null); setNotice(copy.linked);
      try { await onSaved(); } catch { setNotice(copy.linkedReload); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy.errors.linkShort); }
    finally { setPending(false); }
  };
  return <div className="attendee-record-actions">
    {canManage ? <div className="attendee-record-actions__buttons">
      <TactileButton className="roster-edit-action" variant="ghost" aria-label={t(copy.editFor, { name: name(guest) })} onClick={() => { setDraft(guestDraft(guest)); setRevision(guest.revision); setError(""); setFieldErrors({}); setCurrent(null); setView("edit"); }}>{copy.edit}</TactileButton>
      <button className="tactile-button tactile-button--ghost" type="button" aria-label={t(copy.moreFor, { name: name(guest) })} popoverTarget={menuId} ref={trigger}>{copy.more} <ChevronDownIcon height="13" width="13" /></button>
      <div id={menuId} popover="auto" ref={menu} onToggle={placeMenu} className="roster-actions-popover surface-floating" role="group" aria-label={t(copy.actionsFor, { name: name(guest) })}>
        <button type="button" onClick={() => runAction(onEditProfile)}>{copy.editProfile}</button>
        <button type="button" onClick={() => runAction(onNetworking)}>{copy.networking}</button>
        <button type="button" onClick={() => runAction(() => { setView("duplicates"); void loadCandidates(); })}>{copy.reviewDuplicates}</button>
      </div>
    </div> : null}
    {notice ? <span className="attendee-action-status" role="status">{notice}</span> : null}
    {canManage ? <ConsoleDialog open={view !== null} onClose={() => setView(null)} busy={pending} title={view === "edit" ? copy.editTitle : copy.duplicatesTitle} description={name(guest)}>
      {view === "edit" ? <form className="attendee-details-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={pending} className="event-form-grid">{fields.map(([key, maxLength]) => <EventField key={key} label={copy.fields[key]} error={fieldErrors[key]}>{(id, help) => <input className="event-control" id={id} aria-describedby={help} aria-invalid={!!fieldErrors[key]} maxLength={maxLength} inputMode={key === "email" ? "email" : key === "phone" ? "tel" : undefined} value={draft[key]} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setFieldErrors((previous) => ({ ...previous, [key]: "" })); }} />}</EventField>)}<EventField label={copy.fields.guestType} error={fieldErrors.guestType}>{(id) => <select className="event-control" id={id} value={draft.guestType} onChange={(event) => setDraft({ ...draft, guestType: event.target.value as EventGuestType })}><option value="Attendee">{dict.events.guestTypes.Attendee}</option><option value="VIP">{dict.events.guestTypes.VIP}</option><option value="Sponsor">{dict.events.guestTypes.Sponsor}</option></select>}</EventField></fieldset>
        {current ? <div className="event-conflict" role="alert"><h3>{copy.conflict.heading}</h3><p>{copy.conflict.description}</p><div className="event-comparison">{[{ title: copy.conflict.saved, value: current }, { title: copy.conflict.yours, value: draft }].map(({ title, value }) => <div key={title}><h4>{title}</h4><dl>{[...fields.map(([key]) => [copy.fields[key], value[key]]), [copy.fields.guestType, dict.events.guestTypes[value.guestType]]].map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content || copy.notSet}</dd></div>)}</dl></div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { setDraft(guestDraft(current)); setRevision(current.revision); setCurrent(null); }}>{copy.conflict.useSaved}</TactileButton><TactileButton onClick={() => { setRevision(current.revision); setCurrent(null); }}>{copy.conflict.keepMine}</TactileButton></div></div> : null}
        {error ? <p className="event-field__error" role="alert">{error}</p> : null}
        <div className="event-form-footer"><TactileButton disabled={pending} onClick={() => setView(null)}>{copy.cancel}</TactileButton><TactileButton disabled={pending || !!current} type="submit" variant="primary">{pending ? copy.saving : copy.saveChanges}</TactileButton></div>
      </form> : <div className="attendee-duplicate-review">
        {linked.length ? <section className="attendee-linked-records"><h3>{copy.alreadyLinked}</h3>{linked.map((item) => <p key={item.id}><strong>{name(item)}</strong><span>{item.email || item.phone || item.company}</span></p>)}</section> : null}
        <p className="event-section-description">{copy.reviewHint}</p>
        {pending && candidates === null ? <p role="status">{copy.checking}</p> : candidates?.length ? <div className="attendee-candidates">{candidates.map((candidate) => <label className="attendee-candidate-option" key={candidate.guestId}><input type="radio" name={`duplicate-${guest.id}`} checked={selected?.guestId === candidate.guestId} disabled={pending} onChange={() => { setSelected(candidate); setConfirmed(false); setError(""); }} /><span><strong>{name(candidate)}</strong><span>{candidate.company || copy.companyNotSet}</span>{candidate.reasons.includes("email") ? <small>{t(copy.sameEmail, { email: candidate.email })}</small> : null}{candidate.reasons.includes("phone") ? <small>{t(copy.samePhone, { phone: candidate.phone })}</small> : null}</span></label>)}</div> : candidates ? <p className="event-form-empty">{copy.noDuplicates}</p> : null}
        {selected ? <section className="attendee-link-confirmation"><h3>{copy.confirmHeading}</h3><p>{t(copy.confirmBody, { first: name(guest), second: name(selected) })}{linked.length ? plural(copy.confirmAlso, linked.length, { name: name(guest) }) : ""}</p><label><input type="checkbox" checked={confirmed} disabled={pending} onChange={(event) => setConfirmed(event.target.checked)} /> {copy.confirmCheckbox}</label></section> : null}
        {error ? <div role="alert"><p className="event-field__error">{error}</p><button className="event-text-action" type="button" disabled={pending} onClick={() => void loadCandidates()}>{copy.checkAgain}</button></div> : null}
        <div className="event-form-footer"><TactileButton disabled={pending} onClick={() => setView(null)}>{copy.close}</TactileButton>{selected ? <TactileButton variant="graphite" disabled={!confirmed || pending} onClick={() => void link()}>{pending ? copy.linking : copy.linkAction}</TactileButton> : null}</div>
      </div>}
    </ConsoleDialog> : null}
  </div>;
}
