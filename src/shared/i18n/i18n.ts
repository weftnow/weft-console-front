import type { Dictionary } from "./dictionaries";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "./format";
import type { Locale } from "./locales";
import { translate, translatePlural, type PluralLeaf, type Vars } from "./translate";

export type I18n = ReturnType<typeof createI18n>;

/** Bind a dictionary and locale into the helpers components use. Pure, so servers can use it too. */
export function createI18n(locale: Locale, dict: Dictionary) {
  return {
    locale,
    dict,
    t: translate,
    plural: (leaf: PluralLeaf, count: number, vars?: Vars) => translatePlural(locale, leaf, count, vars),
    number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
    date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions, timeZone?: string) =>
      formatDate(locale, value, options, timeZone),
    dateTime: (value: Date | string | number, timeZone?: string, options?: Intl.DateTimeFormatOptions) =>
      formatDateTime(locale, value, timeZone, options),
    relative: (value: Date | string | number, now?: Date | string | number) => formatRelative(locale, value, now),
  };
}
