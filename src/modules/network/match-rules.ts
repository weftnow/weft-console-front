import { isBlockedPair, isIncludedInMatching } from "@/modules/attendees/networking-eligibility";
import type { MatchRevocationReason } from "./matching-feed-schemas";

export type MatchIntroductionPath = "sms_coordination" | "wefter";
export type GuestType = "Attendee" | "VIP" | "Sponsor";

export type EligibilityGuest = {
  id: string;
  personId: string;
  guestType: GuestType;
  networkingStatus: "included" | "excluded";
  profileVersion: number;
};

/** A pair with a VIP or Sponsor is introduced by a Wefter; two regular attendees use message coordination outside the Console. */
export function introductionPathFor(a: GuestType, b: GuestType): MatchIntroductionPath {
  return a === "Attendee" && b === "Attendee" ? "sms_coordination" : "wefter";
}

/**
 * Re-checks an issued recommendation against the Console's own data. Returns null when the pair is valid, otherwise the
 * reason it is stored revoked. The order is stable so one cause is reported when several apply.
 */
export function revocationReasonForIssued(
  low: EligibilityGuest,
  high: EligibilityGuest,
  blocks: readonly { guestIds: [string, string] }[],
): MatchRevocationReason | null {
  for (const guest of [low, high]) {
    if (!isIncludedInMatching({ networking: { status: guest.networkingStatus } })) return "guest_excluded";
  }
  if (isBlockedPair(blocks, low.id, high.id)) return "pair_blocked";
  if (low.personId === high.personId) return "identity_resolution_required";
  return null;
}

/** The engine pins versions it read from the Console's append-only history, so a pinned version can never be newer. */
export function pinnedVersionsAreKnown(low: EligibilityGuest, high: EligibilityGuest, pinned: { low: number; high: number }): boolean {
  return pinned.low <= low.profileVersion && pinned.high <= high.profileVersion;
}
