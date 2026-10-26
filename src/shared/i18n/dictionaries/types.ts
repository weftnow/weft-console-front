import type { en } from "./en";

type Widen<T> = T extends string ? string : { -readonly [K in keyof T]: Widen<T[K]> };

/** English leaves widened to `string`, so `es.ts` is checked for the same keys. */
export type Dictionary = Widen<typeof en>;
