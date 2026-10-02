import type { Metadata } from "next";

import { EventDetailPage } from "@/modules/events/components/event-detail-page";
import { EventAccessState } from "@/modules/events/components/event-access-state";
import { getEventDetailTab } from "@/modules/events/event-record";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { getEvent } from "@/modules/events/queries/get-event";
import { uuidSchema } from "@/modules/events/event-schemas";
import type { EventDetailDto } from "@/modules/events/event-dto";
import { ApplicationError } from "@/shared/lib/application-error";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Event overview · Weft Console",
};
export const dynamic = "force-dynamic";

export default async function EventDetailRoute(
  props: PageProps<"/events/[eventId]">,
) {
  const [{ eventId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const initialTab = getEventDetailTab(searchParams.tab);
  const actor = await getCurrentUser();
  if (!actor) return <EventAccessState title="Authentication required" description="Sign in through the configured organization authentication system to view this event." />;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  let event: EventDetailDto | null = null;
  let accessDenied = false;
  try {
    event = await getEvent({ userId: actor.id, eventId });
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") notFound();
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") accessDenied = true;
    else throw error;
  }
  if (accessDenied) return <EventAccessState title="Access required" description="You do not have access to this event." />;
  if (!event) notFound();
  return <EventDetailPage event={event} initialTab={initialTab} key={initialTab} />;
}
