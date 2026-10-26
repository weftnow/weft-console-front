"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { LOCALES, localeSchema, type Locale } from "@/shared/i18n/locales";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { eventLanguageResponseSchema } from "../settings-schemas";
import { EventField } from "./event-form-controls";

/** Owner/Organizer control for the language of this event's match reasons. */
export function EventLanguagePanel({ eventId, language, onSaved }: {
  eventId: string; language: Locale; onSaved: () => Promise<void>;
}) {
  const { dict } = useI18n();
  const copy = dict.events.language;
  const [value, setValue] = useState<Locale>(language);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/events/${eventId}/language`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: value }),
      });
      if (!response.ok) throw new Error(copy.failed);
      return eventLanguageResponseSchema.parse(await response.json()).data;
    },
    onSuccess: async (result) => {
      setNotice({ text: result.changed ? copy.saved : copy.unchanged, error: false });
      await onSaved();
    },
    onError: (error) => setNotice({ text: error.message, error: true }),
  });
  return <Surface as="section" className="panel event-management-panel" depth="raised" aria-labelledby="event-language-heading">
    <div className="event-management-heading"><div><h2 id="event-language-heading">{copy.heading}</h2><p>{copy.description}</p></div></div>
    <form onSubmit={(event) => { event.preventDefault(); setNotice(null); save.mutate(); }}>
      <EventField label={copy.label}>{(id) => <select className="event-control" id={id} value={value} disabled={save.isPending}
        onChange={(event) => { const next = localeSchema.safeParse(event.target.value); if (next.success) setValue(next.data); }}>
        {LOCALES.map((option) => <option key={option} value={option} lang={option}>{dict.common.language[option]}</option>)}
      </select>}</EventField>
      {notice ? <p className={notice.error ? "event-field__error" : "event-form-notice"} role={notice.error ? "alert" : "status"}>{notice.text}</p> : null}
      <div className="event-form-footer"><span /><div className="event-form-actions">
        <TactileButton variant="primary" disabled={save.isPending || value === language} type="submit">{save.isPending ? copy.saving : copy.save}</TactileButton>
      </div></div>
    </form>
  </Surface>;
}
