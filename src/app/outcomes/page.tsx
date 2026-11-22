import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { startOutcomesTrackingAction } from "@/app/outcomes-actions";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { OutcomesReportPage } from "@/modules/insights/components/outcomes-report-page";
import { parseOutcomesEventId } from "@/modules/insights/outcomes-navigation";
import type { OutcomesReport } from "@/modules/insights/outcomes-report";
import { getOutcomesReport } from "@/modules/insights/server/outcomes-service";
import { getI18n } from "@/shared/i18n/get-locale";
import { ApplicationError } from "@/shared/lib/application-error";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.pageTitle.outcomes };
}

export const dynamic = "force-dynamic";

export default async function OutcomesRoute({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string | string[] }>;
}) {
  const context = await requireOrganizerPageContext();
  const resolvedParams = await searchParams;
  const parsed = parseOutcomesEventId(resolvedParams.eventId);
  if (parsed.kind === "invalid") notFound();

  let report: OutcomesReport;
  try {
    report = await getOutcomesReport({
      userId: context.user.id,
      organizationId: context.organization.id,
      includeTimeline: true,
      ...(parsed.kind === "event" ? { eventId: parsed.eventId } : {}),
    });
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  if (parsed.kind === "event" && (report.selectedEventId !== parsed.eventId || report.events.length === 0)) {
    notFound();
  }

  return (
    <OutcomesReportPage
      organizationName={context.organization.name}
      report={report}
      startTrackingAction={report.simulated ? undefined : startOutcomesTrackingAction}
    />
  );
}
