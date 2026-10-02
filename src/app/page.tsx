import { OrganizerOverview } from "@/modules/insights/components/organizer-overview";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";

export default async function Home() {
  const context = await requireOrganizerPageContext();
  return <OrganizerOverview context={context} />;
}
