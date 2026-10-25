"use client";

import { useId, useState, type ReactNode } from "react";
import type { TimeInterval } from "../settings-schemas";
import { eventTimeInstant, localEventTime } from "../event-form";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { TactileButton } from "@/shared/ui/tactile-button";

export function EventField({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string, descriptionId: string | undefined) => ReactNode }) {
  const id = useId();
  return <div className="event-field"><label htmlFor={id}>{label}</label>{children(id, hint || error ? `${id}-help` : undefined)}{hint || error ? <p id={`${id}-help`} className={error ? "event-field__error" : "event-field__hint"} role={error ? "alert" : undefined}>{error || hint}</p> : null}</div>;
}
export function EventTimeField({ label, value, timezone, onChange, hint, error }: {
  label: string; value: string | null; timezone: string; onChange: (value: string) => void; hint?: string; error?: string;
}) {
  const { dict, t } = useI18n();
  const [timeError, setTimeError] = useState("");
  return <EventField label={label} hint={hint} error={timeError || error}>{(id, help) => <input id={id} className="event-control" type="datetime-local" value={localEventTime(value, timezone)} aria-describedby={help} aria-invalid={!!(timeError || error)} onChange={(event) => {
    try { onChange(eventTimeInstant(event.target.value, timezone)); setTimeError(""); }
    catch { setTimeError(t(dict.events.form.ambiguousTime, { timezone })); }
  }} />}</EventField>;
}
export function EventIntervals({ windows, timezone, onChange, label, error }: {
  windows: TimeInterval[]; timezone: string; onChange: (windows: TimeInterval[]) => void; label: string; error?: string;
}) {
  const { dict, t } = useI18n();
  const copy = dict.events.form;
  return <div className="event-intervals">{windows.length ? windows.map((window, index) => <div className="event-interval" key={index}>
    <EventTimeField label={t(copy.start, { n: index + 1 })} value={window.startsAt} timezone={timezone} onChange={(value) => onChange(windows.map((item, i) => i === index ? { ...item, startsAt: value } : item))} />
    <EventTimeField label={t(copy.end, { n: index + 1 })} value={window.endsAt} timezone={timezone} onChange={(value) => onChange(windows.map((item, i) => i === index ? { ...item, endsAt: value } : item))} />
    <button className="event-text-action" type="button" aria-label={t(copy.removeNamed, { label: label.toLowerCase(), n: index + 1 })} onClick={() => onChange(windows.filter((_, i) => i !== index))}>{copy.remove}</button>
  </div>) : <p className="event-form-empty">{copy.noHours}</p>}{error ? <p className="event-field__error" role="alert">{error}</p> : null}<TactileButton className="event-form-button" disabled={windows.length >= 30} onClick={() => onChange([...windows, { startsAt: "", endsAt: "" }])}>{t(copy.addNamed, { label: label.toLowerCase() })}</TactileButton></div>;
}
