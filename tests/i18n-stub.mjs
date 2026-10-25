import { loadTs, stubTs } from "./load-ts.mjs";

/** Make `useI18n()` and `getI18n()` work without a provider so components render in tests. Returns the i18n value. */
export function stubI18n(locale = "en") {
  const { createI18n } = loadTs("src/shared/i18n/i18n.ts");
  const dictionary = loadTs(`src/shared/i18n/dictionaries/${locale}.ts`)[locale];
  const value = createI18n(locale, dictionary);
  stubTs("@/shared/i18n/I18nProvider", { useI18n: () => value, I18nProvider: ({ children }) => children });
  stubTs("@/shared/i18n/get-locale", { getLocale: async () => locale, getI18n: async () => value });
  return value;
}
