import { ORGANIZER_ONLY_FIELDS, PROFILE_FIELD_LABELS } from "./profile-schemas";
import type { ProfileCompleteness, ProfileDto, ShareableSummary } from "./profile-schemas";

/** Which matching details have content. Lets the roster load completeness without loading profile text. */
export type ProfilePresence = Record<"goals" | "offers" | "desiredConnections" | "background" | "linkedinDetails", boolean>;

export const EMPTY_PRESENCE: ProfilePresence = { goals: false, offers: false, desiredConnections: false, background: false, linkedinDetails: false };

export function profilePresence(fields: Pick<ProfileDto["fields"], keyof ProfilePresence>): ProfilePresence {
  return {
    goals: fields.goals !== null, offers: fields.offers !== null, desiredConnections: fields.desiredConnections !== null,
    background: fields.background !== null, linkedinDetails: fields.linkedinDetails !== null,
  };
}

/**
 * What matching can use. Nothing here gates matching: a missing detail stays unknown.
 * A LinkedIn URL alone is `url_only`; it never means the profile content was read.
 */
export function profileCompleteness(guest: { linkedin: string }, presence: ProfilePresence): ProfileCompleteness {
  const status = (present: boolean) => (present ? "available" : "missing") as "available" | "missing";
  return {
    goals: status(presence.goals),
    offers: status(presence.offers),
    desiredConnections: status(presence.desiredConnections),
    background: status(presence.background),
    linkedin: presence.linkedinDetails ? "available" : guest.linkedin.trim() ? "url_only" : "missing",
  };
}

/** The profile as it may be shared: organizer-only fields are left out. They are still sent to matching. */
export function shareableSummary(profile: Pick<ProfileDto, "fields" | "organizerOnly">): ShareableSummary {
  const hidden = new Set<string>(profile.organizerOnly);
  return {
    summary: profile.fields.summary,
    details: ORGANIZER_ONLY_FIELDS.flatMap((key) => {
      const value = profile.fields[key];
      return value === null || hidden.has(key) ? [] : [{ key, label: PROFILE_FIELD_LABELS[key], value }];
    }),
  };
}
