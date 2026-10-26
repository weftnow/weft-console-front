import type { Metadata } from "next";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { EventsPage } from "@/modules/events/components/events-page";
import { listEvents } from "@/modules/events/queries/list-events";

export const metadata: Metadata = { title: "Events · Weft Console" };
export const dynamic = "force-dynamic";

export default async function Events() {
  const context = await requireOrganizerPageContext();
  return <EventsPage events={await listEvents({ userId: context.user.id, organizationId: context.organization.id })} />;
}
