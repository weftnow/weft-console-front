import type { Metadata } from "next";

import { CreateEventPage } from "@/modules/events/components/create-event-page";
import { EventAccessState } from "@/modules/events/components/event-access-state";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { getCreateEventContext } from "@/modules/organizations/service";

export const metadata: Metadata = {
  title: "Create event · Weft Console",
};

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  const actor = await getCurrentUser();
  if (!actor) return <EventAccessState title="Authentication required" description="Sign in through the configured organization authentication system to create an event." />;
  const context = await getCreateEventContext(actor);
  if (!context.organizations.length) return <EventAccessState title="Access required" description="Your account needs an active organizer or owner membership to create events." />;
  return <CreateEventPage context={context} />;
}
