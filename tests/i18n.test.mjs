import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { en } = loadTs("src/shared/i18n/dictionaries/en.ts");
const { es } = loadTs("src/shared/i18n/dictionaries/es.ts");
const { negotiateLocale } = loadTs("src/shared/i18n/negotiate.ts");
const { translate, translatePlural } = loadTs("src/shared/i18n/translate.ts");
const { LOCALES, hasLocale, localeSchema, DEFAULT_LOCALE } = loadTs("src/shared/i18n/locales.ts");
const { FIELD_MESSAGE_KEYS, localizeFieldMessage } = loadTs("src/shared/i18n/field-messages.ts");

const isPlural = (value) => value && typeof value === "object" && Object.keys(value).sort().join() === "one,other";

/** Every leaf as [path, string] with plural objects as one leaf. */
function leaves(value, path = []) {
  if (typeof value === "string") return [[path.join("."), value]];
  if (isPlural(value)) return [[path.join("."), value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]));
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");
const english = new Map(leaves(en));
const spanish = new Map(leaves(es));

test("Spanish has exactly the English keys", () => {
  assert.deepEqual([...spanish.keys()].sort(), [...english.keys()].sort());
});

test("no translation is empty", () => {
  for (const [path, value] of [...english, ...spanish]) {
    const texts = typeof value === "string" ? [value] : Object.values(value);
    for (const text of texts) assert.ok(typeof text === "string" && text.trim().length > 0, `empty value at ${path}`);
  }
});

test("placeholders match between languages", () => {
  for (const [path, value] of english) {
    const other = spanish.get(path);
    const pairs = typeof value === "string" ? [[value, other]] : Object.keys(value).map((form) => [value[form], other[form]]);
    for (const [left, right] of pairs) assert.equal(placeholders(right), placeholders(left), `placeholders differ at ${path}`);
  }
});

test("plural leaves have only one and other, in both languages", () => {
  for (const [path, value] of english) {
    assert.equal(isPlural(value), isPlural(spanish.get(path)), `plural shape differs at ${path}`);
    if (typeof value !== "string") assert.match(value.other, /\{(count|\w+)\}|[^{}]/, path);
  }
});

test("locales and negotiation", () => {
  assert.deepEqual([...LOCALES], ["en", "es"]);
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(hasLocale("es"), true);
  assert.equal(hasLocale("fr"), false);
  assert.equal(localeSchema.safeParse("es-MX").success, false);
  assert.equal(negotiateLocale("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(negotiateLocale("fr-FR,fr;q=0.9,en;q=0.5"), "en");
  assert.equal(negotiateLocale("en;q=0.5, es;q=0.9"), "es");
  assert.equal(negotiateLocale("es;q=0, en"), "en");
  assert.equal(negotiateLocale("de, fr;q=0.8"), "en");
  assert.equal(negotiateLocale("*"), "en");
  assert.equal(negotiateLocale(""), "en");
  assert.equal(negotiateLocale(null), "en");
  assert.equal(negotiateLocale("ES-ar"), "es");
  assert.equal(negotiateLocale("es;q=abc"), "en");
});

test("translate fills placeholders and picks plural forms", () => {
  assert.equal(translate("Hello {name}, {n} new", { name: "Ada", n: 3 }), "Hello Ada, 3 new");
  assert.equal(translate("Keep {missing}", { name: "x" }), "Keep {missing}");
  assert.equal(translate("No vars"), "No vars");
  const leaf = { one: "{count} item", other: "{count} items" };
  assert.equal(translatePlural("en", leaf, 1), "1 item");
  assert.equal(translatePlural("en", leaf, 0), "0 items");
  assert.equal(translatePlural("es", { one: "{count} día", other: "{count} días" }, 2), "2 días");
  assert.equal(translatePlural("es", { one: "{count} día", other: "{count} días" }, 1, { extra: "x" }), "1 día");
});

test("every registered validation message is translated in both languages", () => {
  const english = en.errors.fields;
  const spanishFields = es.errors.fields;
  for (const [text, key] of Object.entries(FIELD_MESSAGE_KEYS)) {
    assert.equal(english[key], text, `English dictionary must equal the emitted message for ${key}`);
    assert.ok(spanishFields[key], `missing Spanish for ${key}`);
  }
  const i18n = { dict: es, t: translate };
  assert.equal(localizeFieldMessage(i18n, "Add a first name."), "Agrega un nombre.");
  assert.equal(localizeFieldMessage(i18n, "Row 4: Choose Attendee, VIP, or Sponsor. (3 row errors)"), "Fila 4: Elige Asistente, VIP o Patrocinador. (3 errores de fila)");
  assert.equal(localizeFieldMessage(i18n, "Email also appears on record 7."), "El correo también aparece en el registro 7.");
  assert.equal(localizeFieldMessage(i18n, "Something unregistered."), "Something unregistered.");
});

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const ALLOWED_WORDS = /^(Weft|Wefter|Kami|weft|Weft Console|Console|Clerk|CSV|VIP|LinkedIn|WhatsApp|SMS|Web3|English|Español|Event app)$/;
// TypeScript generics and ternaries sit between angle brackets too; real copy never has these tokens.
const CODE_LIKE = /=|&&|\|\||\bPromise\b|\bvoid\b|\.length|\?\.|\s\?\s|^[:?|]|[?:|]$/;
const textNode = />([^<>{}=\n][^<>{}\n]*)</g;
const attribute = /\b(aria-label|placeholder|title|alt|label|description)="([^"{}]*)"/g;

/** Visible English literals in JSX, ignoring brand names. Heuristic: it flags letters with a space or a capital word. */
export function jsxLiterals(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const found = [];
  for (const match of code.matchAll(textNode)) {
    const text = match[1].trim();
    if (/[A-Za-z]{3,}/.test(text) && !CODE_LIKE.test(text) && !ALLOWED_WORDS.test(text)) found.push(text);
  }
  for (const match of code.matchAll(attribute)) {
    const text = match[2].trim();
    if (/[A-Za-z]{3,}/.test(text) && !ALLOWED_WORDS.test(text) && !/^[a-z0-9_:-]+$/.test(text)) found.push(`${match[1]}="${text}"`);
  }
  return found;
}

// Files whose copy is not extracted yet. The check below is a ratchet: remove a file from this list as soon as it is clean.
const PENDING = new Set([
  "src/modules/events/components/kami-call-modal.tsx",
  "src/modules/events/components/kami-preview-panel.tsx",
  "src/modules/events/components/kami-workspace.tsx",
]);

test("no hardcoded English in component JSX outside the pending list", () => {
  const roots = ["src/modules", "src/shared/ui"];
  const files = roots.flatMap(walk).filter((path) => path.endsWith(".tsx") && (path.includes("/components/") || path.startsWith("src/shared/ui")));
  const offenders = [];
  const stale = [];
  for (const file of files) {
    const literals = jsxLiterals(readFileSync(file, "utf8"));
    if (PENDING.has(file)) { if (literals.length === 0) stale.push(file); continue; }
    if (literals.length) offenders.push(`${file}: ${literals.slice(0, 3).join(" | ")}`);
  }
  assert.deepEqual(offenders, [], "Move these strings into the dictionaries");
  assert.deepEqual(stale, [], "Remove these files from PENDING");
  for (const file of PENDING) assert.ok(files.includes(file), `${file} is pending but does not exist`);
});
