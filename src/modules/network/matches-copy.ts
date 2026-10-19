import type { MatchRevocationReason } from "./matching-feed-schemas";
import type { MatchStatus, MatchSyncNote } from "./matches-schemas";

/** Copy never says a guest accepted, was contacted or will meet: a match is an automatic selection only. */
export const MATCHES_SUBTITLE = "Pairs selected automatically from saved profiles. A match isn’t an acceptance or a meeting.";

export const introductionPathLabels = {
  sms_coordination: "Message coordination",
  wefter: "Wefter-led",
} as const;

export const introductionPathHints = {
  sms_coordination: "Two regular attendees; coordinated by message outside the Console.",
  wefter: "Includes a VIP or sponsor; a Wefter would introduce them.",
} as const;

export const statusLabels: Record<MatchStatus, string> = { active: "Active", revoked: "Revoked" };

export const revocationReasonCopy: Record<MatchRevocationReason, string> = {
  guest_excluded: "A guest was excluded from networking.",
  pair_blocked: "This pair is marked do not match.",
  identity_resolution_required: "The two records may be the same person, so the pair was withdrawn.",
  guest_missing: "A guest record is no longer available.",
};

const unavailable = {
  not_configured: "Matching isn’t connected in this environment yet, so this list may be out of date.",
  unreachable: "The matching service didn’t respond, so this list may be out of date.",
  invalid_response: "The matching service sent an answer this page couldn’t read, so this list may be out of date.",
} as const;

export function describeSync(sync: MatchSyncNote): string | null {
  return sync.state === "unavailable" ? unavailable[sync.reason] : null;
}

export function emptyMatchesCopy(filter: MatchStatus | "all", total: number): { title: string; description: string } {
  if (total > 0) {
    return filter === "revoked"
      ? { title: "No revoked matches", description: "Pairs withdrawn after being selected will appear here with the reason." }
      : { title: "No active matches", description: "Every selected pair has since been revoked. Switch to All to see them." };
  }
  return {
    title: "No matches yet",
    description: "When matching finishes, the pairs it selects appear here automatically. Nothing needs approving.",
  };
}
