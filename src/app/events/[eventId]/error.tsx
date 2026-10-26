"use client";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { EventAccessState } from "@/modules/events/components/event-access-state";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict } = useI18n();
  return <EventAccessState title={dict.auth.eventUnavailable.title} description={dict.auth.eventUnavailable.description} action={<button className="tactile-button" onClick={reset} type="button">{dict.common.actions.retry}</button>} />;
}
