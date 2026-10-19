import type { MatchingStatusDto, MatchingState } from "./matching-status-schemas";

export type MatchingTone = "neutral" | "active" | "good" | "problem";
export type MatchingStatusCopy = { label: string; tone: MatchingTone; detail: string; source: string | null };

const labels: Record<MatchingState, { label: string; tone: MatchingTone }> = {
  idle: { label: "Not started", tone: "neutral" },
  waiting: { label: "Waiting for changes to settle", tone: "active" },
  running: { label: "Matching in progress", tone: "active" },
  failed: { label: "Matching couldn’t finish", tone: "problem" },
  invalid_result: { label: "Result not used", tone: "problem" },
  finished: { label: "Matching finished", tone: "good" },
};

const plural = (count: number) => `${count.toLocaleString()} saved ${count === 1 ? "change" : "changes"}`;

/** Plain-language description of an engine status. Never invents results and never exposes engine error text. */
export function describeMatchingStatus(
  status: MatchingStatusDto,
  format: (isoDate: string) => string,
): MatchingStatusCopy {
  const { label, tone } = labels[status.state];
  const source = status.latestRun
    ? status.latestRun.trigger === "change" ? "Started automatically by saved changes" : "Requested by Weft"
    : null;
  let detail: string;
  if (!status.automaticEnabled && (status.state === "idle" || status.state === "waiting")) {
    detail = status.pendingChanges > 0
      ? `Automatic matching is switched off, so ${plural(status.pendingChanges)} ${status.pendingChanges === 1 ? "is" : "are"} not being matched yet.`
      : "Automatic matching is switched off. Saved changes are not being matched yet.";
  } else if (status.state === "idle") {
    detail = "Matching starts on its own once attendees are imported or their details change.";
  } else if (status.state === "waiting") {
    detail = status.nextAttemptAt && status.pendingChanges === 0
      ? "Matching hit a temporary problem and will try again automatically."
      : `${plural(status.pendingChanges)} will be matched once things have been quiet for a short while.`;
  } else if (status.state === "running") {
    detail = "The latest saved attendee details are being matched.";
  } else if (status.state === "failed") {
    detail = "Matching stopped after a problem. The next saved change will try again.";
  } else if (status.state === "invalid_result") {
    detail = "The latest result didn’t pass checks, so it was not used. The next saved change will try again.";
  } else {
    detail = status.latestRun?.finishedAt ? `Last completed ${format(status.latestRun.finishedAt).toLowerCase()}.` : "The latest saved changes have been matched.";
  }
  return { label, tone, detail, source };
}
