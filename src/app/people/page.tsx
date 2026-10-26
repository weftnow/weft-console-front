import type { Metadata } from "next";
import { getI18n } from "@/shared/i18n/get-locale";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { PeoplePage } from "@/modules/attendees/components/people-page";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.pageTitle.people };
}
export const dynamic = "force-dynamic";

export default async function People() {
  const context = await requireOrganizerPageContext();
  return <PeoplePage context={context} />;
}
