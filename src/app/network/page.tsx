import { NetworkPage } from "@/modules/network/components/network-page";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";

export default async function Page() {
  const context = await requireOrganizerPageContext();
  return <NetworkPage context={context} />;
}
