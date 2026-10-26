import type { I18n } from "@/shared/i18n/i18n";
import type { MatchingStatusDto } from "./matching-status-schemas";

export type MatchingTone = "neutral" | "active" | "good" | "problem";
export type MatchingStatusCopy = { label: string; tone: MatchingTone; detail: string; source: string | null };

const tones: Record<MatchingStatusDto["state"], MatchingTone> = {
  idle: "neutral", waiting: "active", running: "active", failed: "problem", invalid_result: "problem", finished: "good",
};

/** Plain-language description of an engine status. Never invents results and never exposes engine error text. */
export function describeMatchingStatus(i18n: I18n, status: MatchingStatusDto, format: (isoDate: string) => string): MatchingStatusCopy {
  const copy = i18n.dict.network.statusPanel;
  const changes = (count: number) => i18n.plural(copy.savedChanges, count, { count: i18n.number(count) });
  const source = status.latestRun ? (status.latestRun.trigger === "change" ? copy.sourceChange : copy.sourceWeft) : null;
  let detail: string;
  if (!status.automaticEnabled && (status.state === "idle" || status.state === "waiting")) {
    detail = status.pendingChanges > 0
      ? i18n.plural(copy.offPending, status.pendingChanges, { changes: changes(status.pendingChanges) })
      : copy.off;
  } else if (status.state === "idle") {
    detail = copy.idleDetail;
  } else if (status.state === "waiting") {
    detail = status.nextAttemptAt && status.pendingChanges === 0
      ? copy.retrying
      : i18n.plural(copy.willMatch, status.pendingChanges, { changes: changes(status.pendingChanges) });
  } else if (status.state === "running") {
    detail = copy.runningDetail;
  } else if (status.state === "failed") {
    detail = copy.failedDetail;
  } else if (status.state === "invalid_result") {
    detail = copy.invalidDetail;
  } else {
    detail = status.latestRun?.finishedAt ? i18n.t(copy.lastCompleted, { when: format(status.latestRun.finishedAt).toLowerCase() }) : copy.matched;
  }
  return { label: copy.states[status.state], tone: tones[status.state], detail, source };
}
