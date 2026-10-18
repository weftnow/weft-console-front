import type { MatchBlockDto } from "./networking-schemas";

/** Stores a pair in one order so A+B and B+A are the same restriction. */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Single source of truth for whether a guest may be matched; later also requires "identity not on hold". */
export function isIncludedInMatching(guest: { networking: { status: "included" | "excluded" } }): boolean {
  return guest.networking.status === "included";
}

export function isBlockedPair(blocks: readonly Pick<MatchBlockDto, "guestIds">[], a: string, b: string): boolean {
  const [low, high] = canonicalPair(a, b);
  return blocks.some((block) => block.guestIds[0] === low && block.guestIds[1] === high);
}
