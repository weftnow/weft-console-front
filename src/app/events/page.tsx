import type { Metadata } from "next";

import { EventsPage } from "@/modules/events/components/events-page";

export const metadata: Metadata = {
  title: "Events · Weft Console",
};

export default function Events() {
  return <EventsPage />;
}
