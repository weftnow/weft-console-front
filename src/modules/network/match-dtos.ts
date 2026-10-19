import type { MatchDetailDto, MatchSummaryDto } from "./matches-schemas";

type MatchRowLike = {
  id: string; status: "active" | "revoked"; introductionPath: "sms_coordination" | "wefter"; pairScore: number;
  guestLowId: string; guestHighId: string; sourceRunId: string | null;
  profileVersionLow: number; profileVersionHigh: number; scoreLow: number; scoreHigh: number;
  benefits: Record<string, string | null>; shareableReasons: Record<string, string | null>;
  missingInformation: Record<string, string[]>; evidence: Array<Record<string, string>>; uncertainty: string;
  createdAt: Date; revokedAt: Date | null;
  revocationReason: "guest_excluded" | "pair_blocked" | "identity_resolution_required" | "guest_missing" | null;
};
export type GuestLike = {
  id: string; firstName: string; lastName: string; company: string; jobPosition: string;
  guestType: "Attendee" | "VIP" | "Sponsor"; networkingStatus: "included" | "excluded"; profileVersion: number;
};
export type ProfileFields = { summary: string | null; goals: string | null; offers: string | null; desiredConnections: string | null; background: string | null };

const PREVIEW_LENGTH = 160;

export const guestName = (guest: Pick<GuestLike, "firstName" | "lastName">) => `${guest.firstName} ${guest.lastName}`.trim();

function toGuest(guest: GuestLike) {
  return { id: guest.id, name: guestName(guest), company: guest.company, jobPosition: guest.jobPosition, guestType: guest.guestType };
}

function truncate(value: string): string {
  return value.length <= PREVIEW_LENGTH ? value : `${value.slice(0, PREVIEW_LENGTH - 1).trimEnd()}…`;
}

/** First shareable reason, else first benefit; shortened for list rows. */
function reasonPreview(row: MatchRowLike): string | null {
  for (const id of [row.guestLowId, row.guestHighId]) {
    const text = row.shareableReasons[id] ?? row.benefits[id];
    if (text) return truncate(text);
  }
  return null;
}

export function toMatchSummary(row: MatchRowLike, low: GuestLike, high: GuestLike): MatchSummaryDto {
  return {
    id: row.id, status: row.status, introductionPath: row.introductionPath, pairScore: row.pairScore,
    guests: [toGuest(low), toGuest(high)], reasonPreview: reasonPreview(row),
    createdAt: row.createdAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null, revocationReason: row.revocationReason,
  };
}

export function toMatchDetail(input: {
  row: MatchRowLike; low: GuestLike; high: GuestLike;
  profiles: { low: ProfileFields | null; high: ProfileFields | null };
  restrictions: { guestId: string; otherGuest: Pick<GuestLike, "firstName" | "lastName"> | null; reason: string | null }[];
  earlier: { row: MatchRowLike; guestId: string; otherGuest: Pick<GuestLike, "firstName" | "lastName"> | null }[];
}): MatchDetailDto {
  const { row, low, high } = input;
  const side = (guest: GuestLike, pinned: number, score: number, profile: ProfileFields | null) => ({
    ...toGuest(guest), participation: guest.networkingStatus, benefit: row.benefits[guest.id] ?? null,
    shareableReason: row.shareableReasons[guest.id] ?? null, missingInformation: row.missingInformation[guest.id] ?? [],
    pinnedProfileVersion: pinned, currentProfileVersion: guest.profileVersion, directionalScore: score, profile,
  });
  return {
    ...toMatchSummary(row, low, high),
    guests: [
      side(low, row.profileVersionLow, row.scoreLow, input.profiles.low),
      side(high, row.profileVersionHigh, row.scoreHigh, input.profiles.high),
    ],
    uncertainty: row.uncertainty, sourceRunId: row.sourceRunId, evidence: row.evidence,
    restrictions: input.restrictions.map((r) => ({ guestId: r.guestId, otherGuestName: r.otherGuest ? guestName(r.otherGuest) : "Unknown guest", reason: r.reason })),
    earlierIntroductions: input.earlier.map((e) => ({
      matchId: e.row.id, guestId: e.guestId, otherGuestName: e.otherGuest ? guestName(e.otherGuest) : "Unknown guest",
      status: e.row.status, createdAt: e.row.createdAt.toISOString(),
    })),
  };
}
