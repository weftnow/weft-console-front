import { DEFAULT_LOCALE, hasLocale, type Locale } from "./locales";

/** Pick the supported locale with the highest q-value in an Accept-Language header. */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam === undefined ? 1 : Number(qParam.slice(2));
      return { language: tag.trim().toLowerCase().split("-")[0] ?? "", q, index };
    })
    .filter((entry) => entry.language && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { language } of ranked) {
    if (hasLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
