import type { Locale } from "./locales";

type DateInput = Date | string | number;

const asDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  locale: Locale,
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, ...(timeZone ? { timeZone } : {}) }).format(asDate(value));
}

export function formatDateTime(
  locale: Locale,
  value: DateInput,
  timeZone?: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return formatDate(locale, value, options, timeZone);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000], ["month", 2_592_000], ["day", 86_400],
  ["hour", 3_600], ["minute", 60], ["second", 1],
];

export function formatRelative(locale: Locale, value: DateInput, now: DateInput = Date.now()): string {
  const seconds = Math.round((asDate(value).getTime() - asDate(now).getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size || unit === "second") {
      return formatter.format(Math.round(seconds / size), unit);
    }
  }
  return formatter.format(0, "second");
}
