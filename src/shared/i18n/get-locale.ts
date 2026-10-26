import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { getDictionary } from "./dictionaries";
import { createI18n } from "./i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, hasLocale, type Locale } from "./locales";
import { negotiateLocale } from "./negotiate";

/** Signed-in user, then cookie, then Accept-Language, then English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser().catch(() => null);
  if (user) return user.locale;
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (hasLocale(stored)) return stored;
  const header = (await headers()).get("accept-language");
  return header ? negotiateLocale(header) : DEFAULT_LOCALE;
});

/** Locale, dictionary and formatters for Server Components and server actions. */
export async function getI18n() {
  const locale = await getLocale();
  return createI18n(locale, await getDictionary(locale));
}
