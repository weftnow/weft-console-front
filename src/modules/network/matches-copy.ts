import type { I18n } from "@/shared/i18n/i18n";
import type { MatchStatus, MatchSyncNote } from "./matches-schemas";

/** Copy never says a guest accepted, was contacted or will meet: a match is an automatic selection only. */
export function describeSync(i18n: I18n, sync: MatchSyncNote): string | null {
  return sync.state === "unavailable" ? i18n.dict.network.matches.sync[sync.reason] : null;
}

export function emptyMatchesCopy(i18n: I18n, filter: MatchStatus | "all", total: number): { title: string; description: string } {
  const copy = i18n.dict.network.matches.empty;
  if (total > 0) {
    return filter === "revoked"
      ? { title: copy.revokedTitle, description: copy.revokedDescription }
      : { title: copy.activeTitle, description: copy.activeDescription };
  }
  return { title: copy.noneTitle, description: copy.noneDescription };
}
