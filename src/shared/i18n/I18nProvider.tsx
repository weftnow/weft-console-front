"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Dictionary } from "./dictionaries";
import { createI18n, type I18n } from "./i18n";
import type { Locale } from "./locales";

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, dictionary, children }: { locale: Locale; dictionary: Dictionary; children: ReactNode }) {
  const value = useMemo(() => createI18n(locale, dictionary), [locale, dictionary]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
