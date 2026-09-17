import type { OutcomeLabel } from "../partner-report-data";

/** Quiet pill used for opportunity status and introduction outcomes. */
export function OutcomeBadge({ outcome }: { outcome: OutcomeLabel }) {
  return (
    <span className={`outcome-badge outcome-badge--${outcome.tone}`}>{outcome.label}</span>
  );
}
