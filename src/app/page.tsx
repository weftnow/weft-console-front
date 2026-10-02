import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { listEvents } from "@/modules/events/queries/list-events";
import { OrganizerOverview } from "@/modules/insights/components/organizer-overview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const context = await requireOrganizerPageContext();
  return <OrganizerOverview context={context} events={await listEvents({ userId: context.user.id })} />;
}
