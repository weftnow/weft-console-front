import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { ReportingPage } from "@/modules/insights/components/reporting-page";
import { parseReportQuery } from "@/modules/insights/reporting-navigation";
import { buildReportingProjections } from "@/modules/insights/reporting-projections";
import { readReportingSources } from "@/modules/insights/server/reporting-evidence";
import { getI18n, getLocale } from "@/shared/i18n/get-locale";
import { ApplicationError } from "@/shared/lib/application-error";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.pageTitle.outcomes };
}

export default async function OutcomesReports({ searchParams }: PageProps<"/outcomes/reports">) {
  const context = await requireOrganizerPageContext();
  const query = parseReportQuery(await searchParams);
  if (!query) notFound();

  const scope = { userId: context.user.id, organizationId: context.organization.id };
  const { events, sources, selectedEventId } = await readReportingSources(scope, {
    eventId: query.eventId,
    across: query.view === "across",
  }).catch((error: unknown) => {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") notFound();
    throw error;
  });

  const series = new Map<string, string>();
  const sponsors = new Map<string, string>();
  for (const { evidence } of sources) {
    if (evidence?.series && !series.has(evidence.series.key)) series.set(evidence.series.key, evidence.series.label);
    for (const sponsor of evidence?.sponsors ?? []) {
      if (!sponsors.has(sponsor.key)) sponsors.set(sponsor.key, sponsor.label);
    }
  }

  const reportQuery = {
    ...query,
    eventId: selectedEventId ?? query.eventId,
    sponsor: query.sponsor && sponsors.has(query.sponsor) ? query.sponsor : undefined,
  };

  return (
    <ReportingPage locale={await getLocale()} model={{
      organizationName: context.organization.name,
      events,
      selectedEventId,
      query: reportQuery,
      series: [...series].map(([key, label]) => ({ key, label })),
      sponsors: [...sponsors].map(([key, label]) => ({ key, label })),
      projections: buildReportingProjections(sources, reportQuery, new Date()),
    }} />
  );
}
