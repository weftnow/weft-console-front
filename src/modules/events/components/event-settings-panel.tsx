"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsDtoSchema, settingsResponseSchema, networkingSettingsSchema, type NetworkingSettings } from "../settings-schemas";
import { describeSetting, eventFormErrorSchema } from "../event-form";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { EventField, EventIntervals, EventTimeField } from "./event-form-controls";
import { CalendarIcon } from "@/shared/ui/icons";

type SettingsDto = ReturnType<typeof settingsDtoSchema.parse>;
const blank: NetworkingSettings = { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };
const limitFields = ["softMaxIntroductionsPerGuest", "locationFreshnessMinutes", "dispatchAcknowledgmentMinutes", "missedMeetingMinutes"] as const;
export function EventSettingsPanel({ eventId }: { eventId: string }) {
  const i18n = useI18n();
  const { dict, t } = i18n;
  const copy = dict.events.settings;
  const client = useQueryClient();
  const key = ["event-settings", eventId];
  const query = useQuery({ queryKey: key, queryFn: async () => {
    const response = await fetch(`/api/events/${eventId}/settings`, { cache: "no-store" });
    if (!response.ok) throw new Error(copy.loadFailed);
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
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.path[0] === "networkingWindows" ? copy.errors.windows : issue.path[0] === "landmarks" ? copy.errors.landmarks : copy.errors.number])));
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
      throw new Error(error.success ? error.data.error.message : copy.errors.saveFailed);
    }
    const value = settingsResponseSchema.parse(body).data.settings;
    client.setQueryData(key, value); setDraft(null); setConflict(null); setErrors({}); setNotice(copy.saved);
  }, onError: (error) => setNotice(error.message) });

  function setField<K extends keyof NetworkingSettings>(field: K, value: NetworkingSettings[K]) {
    setDraft((previous) => ({ settings: { ...(previous?.settings ?? query.data?.settings ?? blank), [field]: value }, revision: previous?.revision ?? query.data?.revision ?? 0 }));
    setErrors((previous) => ({ ...previous, [field]: "" })); setNotice("");
  }

  if (query.isPending) return <Surface className="panel event-management-panel" depth="raised"><p role="status">{copy.loading}</p></Surface>;
  if (!query.data) return <Surface className="panel event-management-panel" depth="raised"><p role="alert">{copy.loadFailed}</p><TactileButton onClick={() => void query.refetch()}>{dict.common.actions.retry}</TactileButton></Surface>;
  const timezone = query.data.timezone;
  return <Surface as="section" className="panel event-management-panel" depth="raised" aria-labelledby="event-settings-heading">
    <div className="event-management-heading"><span className="event-management-icon surface-inset"><CalendarIcon height="20" width="20" /></span><div><h2 id="event-settings-heading">{copy.heading}</h2><p>{copy.description}</p></div><span className="event-timezone">{timezone.replaceAll("_", " ")}</span></div>
    {query.isError ? <p className="event-field__error" role="status">{copy.refreshFailed} <button className="event-text-action" onClick={() => void query.refetch()} type="button">{dict.common.actions.retry}</button></p> : null}
    <form onSubmit={(event) => { event.preventDefault(); setErrors({}); setNotice(""); save.mutate(); }}>
      <fieldset disabled={save.isPending} className="event-form-section">
        <legend>{copy.hoursHeading}</legend><p className="event-section-description">{copy.hoursDescription}</p>
        <EventIntervals label={dict.events.form.hoursLabel} timezone={timezone} windows={current.networkingWindows} onChange={(value) => setField("networkingWindows", value)} error={errors.networkingWindows} />
        <div className="event-form-grid"><EventTimeField label={copy.labels.stopNewIntroductionsAt} timezone={timezone} value={current.stopNewIntroductionsAt} onChange={(value) => setField("stopNewIntroductionsAt", value || null)} error={errors.stopNewIntroductionsAt} hint={copy.stopHint} /></div>
      </fieldset>
      <fieldset disabled={save.isPending} className="event-form-section"><legend>{copy.placesHeading}</legend><p className="event-section-description">{copy.placesDescription}</p>
        {current.landmarks.length ? <div className="event-places">{current.landmarks.map((place, index) => <div className="event-place" key={place.id}>
          <EventField label={t(copy.placeName, { n: index + 1 })}>{(id) => <input className="event-control" id={id} maxLength={100} required value={place.name} placeholder={copy.placeNamePlaceholder} onChange={(e) => setField("landmarks", current.landmarks.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />}</EventField>
          <EventField label={copy.directions}>{(id) => <input className="event-control" id={id} maxLength={500} value={place.directions ?? ""} placeholder={copy.directionsPlaceholder} onChange={(e) => setField("landmarks", current.landmarks.map((item, i) => i === index ? { ...item, directions: e.target.value || null } : item))} />}</EventField>
          <button className="event-text-action" type="button" aria-label={t(copy.removePlace, { n: index + 1 })} onClick={() => setField("landmarks", current.landmarks.filter((_, i) => i !== index))}>{dict.events.form.remove}</button>
        </div>)}</div> : <p className="event-form-empty">{copy.noPlaces}</p>}
        {errors.landmarks ? <p className="event-field__error" role="alert">{errors.landmarks}</p> : null}
        <TactileButton className="event-form-button" disabled={current.landmarks.length >= 100} onClick={() => setField("landmarks", [...current.landmarks, { id: crypto.randomUUID(), name: "", directions: null }])}>{copy.addPlace}</TactileButton>
      </fieldset>
      <fieldset disabled={save.isPending} className="event-form-section"><legend>{copy.limitsHeading}</legend><p className="event-section-description">{copy.limitsDescription}</p><div className="event-form-grid">{limitFields.map((field) => <EventField key={field} label={copy.labels[field]} hint={copy.hints[field]} error={errors[field]}>{(id, help) => <input className="event-control" id={id} aria-describedby={help} aria-invalid={!!errors[field]} type="number" inputMode="numeric" min={1} max={field === "softMaxIntroductionsPerGuest" ? 1000 : 1440} step={1} value={current[field] ?? ""} placeholder={copy.notSetPlaceholder} onChange={(e) => setField(field, e.target.value === "" ? null : Number(e.target.value))} />}</EventField>)}</div></fieldset>
      {conflict ? <div className="event-conflict" role="alert"><h3>{copy.conflict.heading}</h3><p>{copy.conflict.description}</p><div className="event-comparison">{[{ title: copy.conflict.saved, settings: conflict.settings }, { title: copy.conflict.yours, settings: current }].map(({ title, settings }) => <div key={title}><h4>{title}</h4><dl>{Object.keys(copy.labels).map((field) => <div key={field}><dt>{copy.labels[field as keyof NetworkingSettings]}</dt><dd>{describeSetting(i18n, field as keyof NetworkingSettings, settings, timezone)}</dd></div>)}</dl></div>)}</div><div className="event-form-actions"><TactileButton onClick={() => { client.setQueryData(key, conflict); setDraft(null); setConflict(null); }}>{copy.conflict.useSaved}</TactileButton><TactileButton onClick={() => { setDraft({ settings: current, revision: conflict.revision }); setConflict(null); }}>{copy.conflict.keepMine}</TactileButton></div></div> : null}
      {notice ? <p className={save.isError ? "event-field__error" : "event-form-notice"} role={save.isError ? "alert" : "status"}>{notice}</p> : null}
      <div className="event-form-footer"><span>{draft ? copy.unsaved : query.data.updatedAt ? t(copy.savedAt, { date: i18n.dateTime(query.data.updatedAt, timezone) }) : copy.noneSaved}</span><div className="event-form-actions">{draft ? <TactileButton disabled={save.isPending} onClick={() => { setDraft(null); setConflict(null); setErrors({}); setNotice(""); }}>{copy.discard}</TactileButton> : null}<TactileButton variant="primary" disabled={save.isPending || !draft || !!conflict} type="submit">{save.isPending ? copy.saving : copy.save}</TactileButton></div></div>
    </form>
  </Surface>;
}
