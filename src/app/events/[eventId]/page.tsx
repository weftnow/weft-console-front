import type { Metadata } from "next";

import { EventDetailQueryPage } from "@/modules/events/components/event-detail-query-page";
import { getEventDetailTab } from "@/modules/events/event-record";
import { uuidSchema } from "@/modules/events/event-schemas";
import { notFound } from "next/navigation";
import { requireClerkSession } from "@/infrastructure/auth/require-session";

export const metadata: Metadata = {
  title: "Event overview · Weft Console",
};
export const dynamic = "force-dynamic";

export default async function EventDetailRoute(
  props: PageProps<"/events/[eventId]">,
) {
  await requireClerkSession();
  const [{ eventId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const initialTab = getEventDetailTab(searchParams.tab);
  if (!uuidSchema.safeParse(eventId).success) notFound();
  return <EventDetailQueryPage eventId={eventId} initialTab={initialTab} />;
}
