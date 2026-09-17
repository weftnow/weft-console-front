import type { Metadata } from "next";

import { PeoplePage } from "@/modules/attendees/components/people-page";

export const metadata: Metadata = {
  title: "People · Weft Console",
};

export default function People() {
  return <PeoplePage />;
}
