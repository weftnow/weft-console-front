import type { Metadata } from "next";
import { getI18n } from "@/shared/i18n/get-locale";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { EventsPage } from "@/modules/events/components/events-page";
import { listEvents } from "@/modules/events/queries/list-events";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.pageTitle.events };
}
export const dynamic = "force-dynamic";

export default async function Events() {
  const context = await requireOrganizerPageContext();
  return <EventsPage events={await listEvents({ userId: context.user.id, organizationId: context.organization.id })} />;
}
