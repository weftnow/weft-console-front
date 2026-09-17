import type { Metadata } from "next";

import { PartnerReportPage } from "@/modules/sponsors/components/partner-report-page";

export const metadata: Metadata = {
  title: "Horizon Family Office · Las Vegas · F1 Week · Weft",
};

export default function PartnerReport() {
  return <PartnerReportPage />;
}
