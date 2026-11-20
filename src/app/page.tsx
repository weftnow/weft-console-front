import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { listEvents } from "@/modules/events/queries/list-events";
import { OrganizerOverview, type OverviewOutcomesState } from "@/modules/insights/components/organizer-overview";
import { getOutcomesReport } from "@/modules/insights/server/outcomes-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await requireOrganizerPageContext();
  const [events, outcomes] = await Promise.all([
    listEvents({ userId: context.user.id, organizationId: context.organization.id }),
    getOutcomesReport({ userId: context.user.id, organizationId: context.organization.id })
      .then(({ totals }): OverviewOutcomesState => ({ status: "ready", report: { totals } }))
      .catch((): OverviewOutcomesState => ({ status: "error" })),
  ]);
  return <OrganizerOverview context={context} events={events} outcomes={outcomes} />;
}
