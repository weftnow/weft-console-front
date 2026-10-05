import type { Metadata } from "next";

import { CreateEventPage } from "@/modules/events/components/create-event-page";
import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { getCreateEventPageContexts, requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create event · Weft Console",
};

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  await requireClerkSession();
  const actor = await requireLocalActor();
  const { formContext, selectedOrganizationId } = await getCreateEventPageContexts(actor);
  if (!formContext.organizations.length) redirect("/access-required");
  return <CreateEventPage context={formContext} selectedOrganizationId={selectedOrganizationId} />;
}
