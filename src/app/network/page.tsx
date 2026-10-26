import type { Metadata } from "next";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { NetworkPage } from "@/modules/network/components/network-page";

export const metadata: Metadata = { title: "Network · Weft Console" };
export const dynamic = "force-dynamic";

export default async function Network() {
  const context = await requireOrganizerPageContext();
  return <NetworkPage context={context} />;
}
