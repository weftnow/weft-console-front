import type { Locale } from "./locales";
import type { Dictionary } from "./dictionaries/types";

export type { Dictionary };

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.en),
  es: () => import("./dictionaries/es").then((module) => module.es),
};

/** Each locale loads lazily, so only the active dictionary is bundled for a request. */
export const getDictionary = (locale: Locale): Promise<Dictionary> => loaders[locale]();
