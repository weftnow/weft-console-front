import type { Metadata } from "next";

import { EventDetailPage } from "@/modules/events/components/event-detail-page";
import { getEventDetailTab } from "@/modules/events/event-record";

export const metadata: Metadata = {
  title: "Event overview · Weft Console",
};

export default async function EventDetailRoute(
  props: PageProps<"/events/[eventId]">,
) {
  const [{ eventId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const initialTab = getEventDetailTab(searchParams.tab);

  return (
    <EventDetailPage
      eventId={eventId}
      initialTab={initialTab}
      key={initialTab}
    />
  );
}
