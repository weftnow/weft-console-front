"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { updateUserLocale } from "@/infrastructure/auth/identity-repository";
import { LOCALE_COOKIE, localeSchema } from "@/shared/i18n/locales";

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

/**
 * Change the caller's own language. Signed-in users update only their own row;
 * a signed-out visitor, or an account without a local user, only gets the cookie.
 */
export async function setLocale(value: string): Promise<void> {
  const locale = localeSchema.parse(value);
  const user = await getCurrentUser().catch(() => null);
  if (user) await updateUserLocale(user.id, locale);
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
