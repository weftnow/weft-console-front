import type { Locale } from "./locales";

export type Vars = Record<string, string | number>;
export type PluralLeaf = { one: string; other: string };

/** Replace `{name}` placeholders; an unknown placeholder is left visible. */
export function translate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Choose the plural form for `count`; `{count}` is available to the template. */
export function translatePlural(
  locale: Locale,
  leaf: PluralLeaf,
  count: number,
  vars?: Vars,
): string {
  const form = new Intl.PluralRules(locale).select(count) === "one" ? leaf.one : leaf.other;
  return translate(form, { count, ...vars });
}
