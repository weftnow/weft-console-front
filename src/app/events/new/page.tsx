import type { Metadata } from "next";

import { CreateEventPage } from "@/modules/events/components/create-event-page";

export const metadata: Metadata = {
  title: "Create event · Weft Console",
};

export default function NewEvent() {
  return <CreateEventPage />;
}
