"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsDtoSchema, settingsResponseSchema, networkingSettingsSchema, type NetworkingSettings } from "../settings-schemas";
import { describeSetting, eventFormErrorSchema, settingLabels } from "../event-form";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { EventField, EventIntervals, EventTimeField } from "./event-form-controls";
import { CalendarIcon } from "@/shared/ui/icons";

type SettingsDto = ReturnType<typeof settingsDtoSchema.parse>;
const blank: NetworkingSettings = { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };
const limitFields = ["softMaxIntroductionsPerGuest", "locationFreshnessMinutes", "dispatchAcknowledgmentMinutes", "missedMeetingMinutes"] as const;
const hints = {
  softMaxIntroductionsPerGuest: "A planning guideline, rather than a hard limit.",
  locationFreshnessMinutes: "How recent a guest’s location needs to be. In minutes.",
  dispatchAcknowledgmentMinutes: "How long a Wefter has to acknowledge an assignment. In minutes.",
  missedMeetingMinutes: "How long to wait after a planned meeting time. In minutes.",
};

export function EventSettingsPanel({ eventId }: { eventId: string }) {
  const client = useQueryClient();
  const key = ["event-settings", eventId];
  const query = useQuery({ queryKey: key, queryFn: async () => {
    const response = await fetch(`/api/events/${eventId}/settings`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load settings.");
    return settingsResponseSchema.parse(await response.json()).data.settings;
  }, staleTime: 0 });
  // A background read must never advance the revision of an unsaved draft.
  const [draft, setDraft] = useState<{ settings: NetworkingSettings; revision: number } | null>(null);
  const [conflict, setConflict] = useState<SettingsDto | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const current = draft?.settings ?? query.data?.settings ?? blank;
  const save = useMutation({ mutationFn: async () => {
    if (!draft) return;
    const parsed = networkingSettingsSchema.safeParse(draft.settings);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.path[0] === "networkingWindows" ? "Add a start and end for each set of hours." : issue.path[0] === "landmarks" ? "Give each meeting place a name (up to 100 characters) and directions up to 500 characters." : "Enter a positive whole number within the allowed range."])));
      return;
    }
    const response = await fetch(`/api/events/${eventId}/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: draft.revision, settings: parsed.data }) });
    const body: unknown = await response.json();
    if (!response.ok) {
      const error = eventFormErrorSchema.safeParse(body);
      if (response.status === 409) {
        const latest = settingsDtoSchema.safeParse(error.success ? error.data.error.details?.current : null);
        if (latest.success) { client.setQueryData(key, latest.data); setConflict(latest.data); return; }
      }
      if (error.success) setErrors(error.data.error.fields ?? {});
      throw new Error(error.success ? error.data.error.message : "Could not save settings. Try again.");
    }
    const value = settingsResponseSchema.parse(body).data.settings;
    client.setQueryData(key, value); setDraft(null); setConflict(null); setErrors({}); setNotice("Settings saved.");
  }, onError: (error) => setNotice(error.message) });

  function setField<K extends keyof NetworkingSettings>(field: K, value: NetworkingSettings[K]) {
    setDraft((previous) => ({ settings: { ...(previous?.settings ?? query.data?.settings ?? blank), [field]: value }, revision: previous?.revision ?? query.data?.revision ?? 0 }));
    setErrors((previous) => ({ ...previous, [field]: "" })); setNotice("");
  }

  if (query.isPending) return <Surface className="panel event-management-panel" depth="raised"><p role="status">Loading settings…</p></Surface>;
  if (!query.data) return <Surface className="panel event-management-panel" depth="raised"><p role="alert">Could not load event settings.</p><TactileButton onClick={() => void query.refetch()}>Try again</TactileButton></Surface>;
  const timezone = query.data.timezone;
  return <Surface as="section" className="panel event-management-panel" depth="raised" aria-labelledby="event-settings-heading">
    <div className="event-management-heading"><span className="event-management-icon surface-inset"><CalendarIcon height="20" width="20" /></span><div><h2 id="event-settings-heading">Networking settings</h2><p>Set networking hours, meeting places and introduction limits.</p></div><span className="event-timezone">{timezone.replaceAll("_", " ")}</span></div>
    {query.isError ? <p className="event-field__error" role="status">Could not refresh settings. Your changes are still here. <button className="event-text-action" onClick={() => void query.refetch()} type="button">Try again</button></p> : null}
    <form onSubmit={(event) => { event.preventDefault(); setErrors({}); setNotice(""); save.mutate(); }}>
      <fieldset disabled={save.isPending} className="event-form-section">
        <legend>Networking hours</legend><p className="event-section-description">Choose when networking can take place. All times use the event’s time zone.</p>
        <EventIntervals label="hours" timezone={timezone} windows={current.networkingWindows} onChange={(value) => setField("networkingWindows", value)} error={errors.networkingWindows} />
        <div className="event-form-grid"><EventTimeField label={settingLabels.stopNewIntroductionsAt} timezone={timezone} value={current.stopNewIntroductionsAt} onChange={(value) => setField("stopNewIntroductionsAt", value || null)} error={errors.stopNewIntroductionsAt} hint="Leave empty until a cutoff time has been agreed." /></div>
      </fieldset>
      <fieldset disabled={save.isPending} className="event-form-section"><legend>Meeting places</legend><p className="event-section-description">Add recognizable places where guests can meet.</p>
        {current.landmarks.length ? <div className="event-places">{current.landmarks.map((place, index) => <div className="event-place" key={place.id}>
          <EventField label={`Place name · ${index + 1}`}>{(id) => <input className="event-control" id={id} maxLength={100} required value={place.name} placeholder="e.g. Lobby lounge" onChange={(e) => setField("landmarks", current.landmarks.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />}</EventField>
          <EventField label="Directions (optional)">{(id) => <input className="event-control" id={id} maxLength={500} value={place.directions ?? ""} placeholder="How to find this place" onChange={(e) => setField("landmarks", current.landmarks.map((item, i) => i === index ? { ...item, directions: e.target.value || null } : item))} />}</EventField>
          <button className="event-text-action" type="button" aria-label={`Remove meeting place ${index + 1}`} onClick={() => setField("landmarks", current.landmarks.filter((_, i) => i !== index))}>Remove</button>
        </div>)}</div> : <p className="event-form-empty">No meeting places added.</p>}
        {errors.landmarks ? <p className="event-field__error" role="alert">{errors.landmarks}</p> : null}
        <TactileButton className="event-form-button" disabled={current.landmarks.length >= 100} onClick={() => setField("landmarks", [...current.landmarks, { id: crypto.randomUUID(), name: "", directions: null }])}>Add meeting place</TactileButton>
      </fieldset>
      <fieldset disabled={save.isPending} className="event-form-section"><legend>Introduction limits</legend><p className="event-section-description">Leave values empty until they have been agreed for this event.</p><div className="event-form-grid">{limitFields.map((field) => <EventField key={field} label={settingLabels[field]} hint={hints[field]} error={errors[field]}>{(id, help) => <input className="event-control" id={id} aria-describedby={help} aria-invalid={!!errors[field]} type="number" inputMode="numeric" min={1} max={field === "softMaxIntroductionsPerGuest" ? 1000 : 1440} step={1} value={current[field] ?? ""} placeholder="Not set" onChange={(e) => setField(field, e.target.value === "" ? null : Number(e.target.value))} />}</EventField>)}</div></fieldset>
      {conflict ? <div className="event-conflict" role="alert"><h3>These settings changed while you were editing</h3><p>Compare the saved settings with your changes before saving again.</p><div className="event-comparison">{[{ title: "Saved settings", settings: conflict.settings }, { title: "Your changes", settings: current }].map(({ title, settings }) => <div key={title}><h4>{title}</h4><dl>{Object.keys(settingLabels).map((field) => <div key={field}><dt>{settingLabels[field as keyof NetworkingSettings]}</dt><dd>{describeSetting(field as keyof NetworkingSettings, settings, timezone)}</dd></div>)}</dl></div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { client.setQueryData(key, conflict); setDraft(null); setConflict(null); }}>Use saved settings</TactileButton><TactileButton onClick={() => { setDraft({ settings: current, revision: conflict.revision }); setConflict(null); }}>Keep my changes</TactileButton></div></div> : null}
      {notice ? <p className={save.isError ? "event-field__error" : "event-form-notice"} role={save.isError ? "alert" : "status"}>{notice}</p> : null}
      <div className="event-form-footer"><span>{draft ? "Unsaved changes" : query.data.updatedAt ? `Saved ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(query.data.updatedAt))}` : "No settings saved yet"}</span><div className="event-form-actions">{draft ? <TactileButton disabled={save.isPending} onClick={() => { setDraft(null); setConflict(null); setErrors({}); setNotice(""); }}>Discard changes</TactileButton> : null}<TactileButton variant="primary" disabled={save.isPending || !draft || !!conflict} type="submit">{save.isPending ? "Saving…" : "Save settings"}</TactileButton></div></div>
    </form>
  </Surface>;
}
