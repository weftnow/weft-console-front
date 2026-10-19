"use client";

import { useState } from "react";
import type { SavedEventGuestRecord, EventGuestType } from "../event-record";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { attendeeCandidateResponseSchema, attendeeReplacementSchema } from "../attendee-record-schemas";
import { eventFormErrorSchema } from "../event-form";
import { savedEventGuestDtoSchema } from "../event-dto";
import { EventField } from "./event-form-controls";

type Draft = { firstName: string; lastName: string; email: string; phone: string; company: string; position: string; profileType: string; guestType: EventGuestType; linkedin: string };
type Candidate = ReturnType<typeof attendeeCandidateResponseSchema.parse>["data"]["candidates"][number];
const fields = [
  ["firstName", "First name", 100], ["lastName", "Last name", 100], ["email", "Email", 254], ["phone", "Phone", 40],
  ["company", "Company", 200], ["position", "Position", 200], ["profileType", "Profile type", 100], ["linkedin", "LinkedIn URL", 500],
] as const;
function guestDraft(guest: Draft): Draft {
  return { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone, company: guest.company, position: guest.position, profileType: guest.profileType, guestType: guest.guestType, linkedin: guest.linkedin };
}
function name(guest: { firstName: string; lastName: string }) { return [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Unnamed attendee"; }

export function AttendeeRecordActions({ eventId, guest, guests, canManage, onSaved }: {
  eventId: string; guest: SavedEventGuestRecord; guests: SavedEventGuestRecord[]; canManage: boolean; onSaved: () => void | Promise<void>;
}) {
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
      if (!response.ok) throw new Error("Could not check for duplicates. Try again.");
      setCandidates(attendeeCandidateResponseSchema.parse(body).data.candidates);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not check for duplicates."); }
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
        throw new Error(parsedError.success ? parsedError.data.error.message : "Could not save attendee details. Try again.");
      }
      setView(null); setNotice("Attendee details saved.");
      try { await onSaved(); } catch { setNotice("Details saved. Reload the page to see the latest roster."); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save attendee details."); }
    finally { setPending(false); }
  };
  const link = async () => {
    if (!selected || !confirmed) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/attendee-links`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateGuestId: guest.id, canonicalGuestId: selected.guestId }) });
      if (!response.ok) throw new Error(response.status === 409 ? "These records have changed. Check for duplicates again before linking." : "Could not link these records. Try again.");
      setView(null); setNotice("Records linked as the same person.");
      try { await onSaved(); } catch { setNotice("Records linked. Reload the page to see the latest roster."); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not link attendee records."); }
    finally { setPending(false); }
  };
  return <div className="attendee-record-actions">
    {canManage ? <div className="attendee-record-actions__buttons"><TactileButton className="roster-edit-action" variant="ghost" aria-label="Edit details" onClick={() => { setDraft(guestDraft(guest)); setRevision(guest.revision); setError(""); setFieldErrors({}); setCurrent(null); setView("edit"); }}>Edit</TactileButton><button className="event-text-action" aria-label="Review duplicates" type="button" onClick={() => { setView("duplicates"); void loadCandidates(); }}>Duplicates</button></div> : null}
    {notice ? <span className="attendee-action-status" role="status">{notice}</span> : null}
    {canManage ? <ConsoleDialog open={view !== null} onClose={() => setView(null)} busy={pending} title={view === "edit" ? "Edit attendee details" : "Review duplicates"} description={name(guest)}>
      {view === "edit" ? <form className="attendee-details-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={pending} className="event-form-grid">{fields.map(([key, label, maxLength]) => <EventField key={key} label={label} error={fieldErrors[key]}>{(id, help) => <input className="event-control" id={id} aria-describedby={help} aria-invalid={!!fieldErrors[key]} maxLength={maxLength} inputMode={key === "email" ? "email" : key === "phone" ? "tel" : undefined} value={draft[key]} onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setFieldErrors((previous) => ({ ...previous, [key]: "" })); }} />}</EventField>)}<EventField label="Guest type" error={fieldErrors.guestType}>{(id) => <select className="event-control" id={id} value={draft.guestType} onChange={(event) => setDraft({ ...draft, guestType: event.target.value as EventGuestType })}><option>Attendee</option><option>VIP</option><option>Sponsor</option></select>}</EventField></fieldset>
        {current ? <div className="event-conflict" role="alert"><h3>These details changed while you were editing</h3><p>Compare the saved details with your changes before saving again.</p><div className="event-comparison">{[{ title: "Saved details", value: current }, { title: "Your changes", value: draft }].map(({ title, value }) => <div key={title}><h4>{title}</h4><dl>{[...fields.map(([key, label]) => [label, value[key]]), ["Guest type", value.guestType]].map(([label, content]) => <div key={label}><dt>{label}</dt><dd>{content || "Not set"}</dd></div>)}</dl></div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { setDraft(guestDraft(current)); setRevision(current.revision); setCurrent(null); }}>Use saved details</TactileButton><TactileButton onClick={() => { setRevision(current.revision); setCurrent(null); }}>Keep my changes</TactileButton></div></div> : null}
        {error ? <p className="event-field__error" role="alert">{error}</p> : null}
        <div className="event-form-footer"><TactileButton disabled={pending} onClick={() => setView(null)}>Cancel</TactileButton><TactileButton disabled={pending || !!current} type="submit" variant="primary">{pending ? "Saving…" : "Save changes"}</TactileButton></div>
      </form> : <div className="attendee-duplicate-review">
        {linked.length ? <section className="attendee-linked-records"><h3>Already linked as the same person</h3>{linked.map((item) => <p key={item.id}><strong>{name(item)}</strong><span>{item.email || item.phone || item.company}</span></p>)}</section> : null}
        <p className="event-section-description">Review attendees who share an email or phone number. Link records only if they belong to the same person.</p>
        {pending && candidates === null ? <p role="status">Checking for duplicate attendees…</p> : candidates?.length ? <div className="attendee-candidates">{candidates.map((candidate) => <label className="attendee-candidate-option" key={candidate.guestId}><input type="radio" name={`duplicate-${guest.id}`} checked={selected?.guestId === candidate.guestId} disabled={pending} onChange={() => { setSelected(candidate); setConfirmed(false); setError(""); }} /><span><strong>{name(candidate)}</strong><span>{candidate.company || "Company not set"}</span>{candidate.reasons.includes("email") ? <small>Same email: {candidate.email}</small> : null}{candidate.reasons.includes("phone") ? <small>Same phone: {candidate.phone}</small> : null}</span></label>)}</div> : candidates ? <p className="event-form-empty">No other attendees share this email or phone number.</p> : null}
        {selected ? <section className="attendee-link-confirmation"><h3>Link these records as one person</h3><p><strong>{name(guest)}</strong> and <strong>{name(selected)}</strong> will share one person record. Existing details and import history will be kept.{linked.length ? ` This also links ${linked.length} ${linked.length === 1 ? "record already connected" : "records already connected"} to ${name(guest)}.` : ""}</p><label><input type="checkbox" checked={confirmed} disabled={pending} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm these records belong to the same person.</label></section> : null}
        {error ? <div role="alert"><p className="event-field__error">{error}</p><button className="event-text-action" type="button" disabled={pending} onClick={() => void loadCandidates()}>Check again</button></div> : null}
        <div className="event-form-footer"><TactileButton disabled={pending} onClick={() => setView(null)}>Close</TactileButton>{selected ? <TactileButton variant="graphite" disabled={!confirmed || pending} onClick={() => void link()}>{pending ? "Linking…" : "Link as same person"}</TactileButton> : null}</div>
      </div>}
    </ConsoleDialog> : null}
  </div>;
}
