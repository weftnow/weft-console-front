import type { MatchBlockDto, ParticipationDto, ParticipationInput } from "./networking-schemas";

export type NetworkingMembership = { active: boolean; role: string } | null;
export type NetworkingEvent = { id: string; organizationId: string } | null;

export type ParticipationSnapshot = {
  membership: NetworkingMembership;
  event: NetworkingEvent;
  guest: ParticipationDto | null;
};

export type ParticipationDecision =
  | { kind: "noop"; participation: ParticipationDto }
  | { kind: "update"; next: ParticipationInput; current: ParticipationDto };

export type ParticipationResult = { participation: ParticipationDto; changed: boolean };

export type MatchBlockSnapshot = {
  membership: NetworkingMembership;
  event: NetworkingEvent;
  /** Which of the requested guests belong to this event. */
  knownGuestIds: ReadonlySet<string>;
  existingBlock: MatchBlockDto | null;
};

export type MatchBlockDecision =
  | { kind: "existing"; block: MatchBlockDto }
  | { kind: "create"; pair: [string, string]; reason: string | null };

export type MatchBlockResult = { matchBlock: MatchBlockDto; created: boolean };

export type RemoveBlockSnapshot = {
  membership: NetworkingMembership;
  event: NetworkingEvent;
  block: MatchBlockDto | null;
};
