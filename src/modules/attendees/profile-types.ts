import type { NetworkingEvent, NetworkingMembership } from "./networking-types";
import type { ProfileDto, ProfileInput } from "./profile-schemas";

export type ProfileSnapshot = {
  membership: NetworkingMembership;
  event: NetworkingEvent;
  /** The current saved profile, or the empty version 0 profile. Null when the guest is not on this event. */
  profile: ProfileDto | null;
};

export type ProfileDecision =
  | { kind: "noop"; profile: ProfileDto }
  | { kind: "save"; next: ProfileInput; current: ProfileDto };

export type ProfileSaveResult = { profile: ProfileDto; changed: boolean };
