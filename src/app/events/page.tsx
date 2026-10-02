import type { Metadata } from "next";

import { EventsPage } from "@/modules/events/components/events-page";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";

export const metadata: Metadata = {
  title: "Events · Weft Console",
};

export default async function Events() {
  const context = await requireOrganizerPageContext();
  return <EventsPage context={context} />;
}
