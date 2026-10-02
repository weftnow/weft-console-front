import type { Metadata } from "next";

import { PeoplePage } from "@/modules/attendees/components/people-page";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";

export const metadata: Metadata = {
  title: "People · Weft Console",
};

export default async function People() {
  const context = await requireOrganizerPageContext();
  return <PeoplePage context={context} />;
}
