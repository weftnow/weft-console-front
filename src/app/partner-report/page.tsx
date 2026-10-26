import type { Metadata } from "next";
import { getI18n } from "@/shared/i18n/get-locale";

import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { PartnerReportPage } from "@/modules/sponsors/components/partner-report-page";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.nav.pageTitle.partnerReport };
}
export const dynamic = "force-dynamic";

export default async function PartnerReport() {
  await requireClerkSession();
  return <PartnerReportPage />;
}
