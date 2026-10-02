import type { Metadata } from "next";

import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { PartnerReportPage } from "@/modules/sponsors/components/partner-report-page";

export const metadata: Metadata = { title: "Partner report · Weft" };
export const dynamic = "force-dynamic";

export default async function PartnerReport() {
  await requireClerkSession();
  return <PartnerReportPage />;
}
