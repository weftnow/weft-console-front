import type { Metadata } from "next";

import { requireClerkSession } from "@/infrastructure/auth/require-session";

export const metadata: Metadata = {
  title: "Horizon Family Office · Las Vegas · F1 Week · Weft",
};

export default async function PartnerReport() {
  await requireClerkSession();
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
    <h1 className="text-3xl font-semibold">Sponsor report unavailable</h1>
    <p className="mt-3 text-muted-foreground">This report is unavailable until sponsor participation and report access are connected to an organization.</p>
  </main>;
}
