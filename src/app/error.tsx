"use client";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { EventAccessState } from "@/modules/events/components/event-access-state";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { dict } = useI18n();
  return <EventAccessState title={dict.auth.eventsUnavailable.title} description={dict.auth.eventsUnavailable.description} showBackLink={false} action={<button className="tactile-button tactile-button--neutral" onClick={retry} type="button">{dict.common.actions.retry}</button>} />;
}
