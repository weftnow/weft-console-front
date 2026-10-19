"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function clearOrganizationSelection(): Promise<void> {
  await clearOrganizationSelectionCookie();
}

export async function switchOrganization(): Promise<void> {
  await clearOrganizationSelectionCookie();
  redirect("/select-organization");
}

export async function clearOrganizationSelectionCookie(): Promise<void> {
  (await cookies()).delete("weft_organization_id");
}
