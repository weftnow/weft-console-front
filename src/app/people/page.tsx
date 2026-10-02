import type { Metadata } from "next";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { PeoplePage } from "@/modules/attendees/components/people-page";

export const metadata: Metadata = { title: "People · Weft Console" };
export const dynamic = "force-dynamic";

export default async function People() {
  const context = await requireOrganizerPageContext();
  return <PeoplePage context={context} />;
}
