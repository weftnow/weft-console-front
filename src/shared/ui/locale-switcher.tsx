"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/account/actions";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { LOCALES } from "@/shared/i18n/locales";

/** Language choice. Language names stay in their own language in every locale. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();
  return <div className={`locale-switcher${className ? ` ${className}` : ""}`} role="group" aria-label={dict.common.language.label}>
    {LOCALES.map((option) => <button
      aria-pressed={option === locale}
      disabled={pending}
      key={option}
      lang={option}
      onClick={() => { if (option !== locale) startTransition(() => setLocale(option)); }}
      type="button"
    >{dict.common.language[option]}</button>)}
  </div>;
}
