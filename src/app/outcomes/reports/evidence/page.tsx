import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { EvidenceEditor } from "@/modules/insights/components/evidence-editor";
import { evidenceEditorCopy } from "@/modules/insights/components/evidence-editor-copy";
import { outcomesHref, parseOutcomesEventId } from "@/modules/insights/outcomes-navigation";
import { reportsHref } from "@/modules/insights/reporting-navigation";
import { getReportingEvidence, readReportingSources } from "@/modules/insights/server/reporting-evidence";
import { matchingEngineMode } from "@/modules/network/server/engine-mode";
import { getLocale } from "@/shared/i18n/get-locale";
import { ApplicationError } from "@/shared/lib/application-error";

export const dynamic = "force-dynamic";

export default async function OutcomesEvidence({ searchParams }: PageProps<"/outcomes/reports/evidence">) {
  const context = await requireOrganizerPageContext();
  const selection = parseOutcomesEventId((await searchParams).eventId);
  if (selection.kind !== "event") notFound();

  const { eventId } = selection;
  if (matchingEngineMode() === "simulation") redirect(outcomesHref(eventId));
  const scope = { userId: context.user.id, organizationId: context.organization.id };
  const [document, { sources }] = await Promise.all([
    getReportingEvidence({ ...scope, eventId }),
    readReportingSources(scope, { eventId, across: false }),
  ]).catch((error: unknown) => {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  const event = sources.find((source) => source.id === eventId);
  if (!event) notFound();

  const locale = await getLocale();
  const copy = evidenceEditorCopy[locale];

  return (
    <main className="dashboard-main outcomes-main">
      <header className="events-header">
        <div className="events-header__copy">
          <Link href={reportsHref(eventId)}>{copy.back}</Link>
          <p className="section-kicker">{event.name}</p>
          <h1 className="events-header__title">{copy.title}</h1>
          <p className="events-header__subtitle">{copy.intro}</p>
        </div>
      </header>
      <EvidenceEditor event={{ id: event.id, people: event.people, matches: event.matches }} initial={document} locale={locale} />
    </main>
  );
}
