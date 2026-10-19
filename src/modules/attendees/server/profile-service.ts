import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { requireEventCreator } from "@/modules/organizations/service";
import { uuidSchema } from "@/modules/events/event-schemas";
import * as eventRepository from "@/modules/events/server/repository";
import { profileCompleteness, profilePresence, shareableSummary } from "../profile-completeness";
import { PROFILE_FIELDS, profileInputSchema } from "../profile-schemas";
import type { ProfileDto, ProfileInput, ProfileRead } from "../profile-schemas";
import type { ProfileDecision, ProfileSaveResult, ProfileSnapshot } from "../profile-types";
import { requireOperator, validationFields } from "./networking-service";

/** Stale save: carries the latest saved profile so the client can show it. */
export class ProfileConflictError extends ApplicationError {
  constructor(public readonly latest: ProfileDto) {
    super("CONFLICT", "Someone else changed this profile. Review the latest saved version and try again.");
    this.name = "ProfileConflictError";
  }
}

function sameContent(current: ProfileDto, next: ProfileInput) {
  return PROFILE_FIELDS.every((key) => current.fields[key] === next.fields[key])
    && current.organizerOnly.length === next.organizerOnly.length
    && current.organizerOnly.every((key, index) => key === next.organizerOnly[index]);
}

export function decideProfileSave(snapshot: ProfileSnapshot, input: ProfileInput): ProfileDecision {
  requireOperator(snapshot.event, snapshot.membership);
  if (!snapshot.profile) throw new ApplicationError("NOT_FOUND", "Guest not found.");
  if (sameContent(snapshot.profile, input)) return { kind: "noop", profile: snapshot.profile };
  if (snapshot.profile.version !== input.expectedVersion) throw new ProfileConflictError(snapshot.profile);
  return { kind: "save", next: input, current: snapshot.profile };
}

/** Profile, what is available or missing, and the shareable summary. Completeness never gates matching. */
export function toProfileRead(profile: ProfileDto, guest: { linkedin: string }): ProfileRead {
  return { profile, completeness: profileCompleteness(guest, profilePresence(profile.fields)), summary: shareableSummary(profile) };
}

type Base = { findOrganizationId: typeof eventRepository.findOrganizationId; requireCreator: typeof requireEventCreator };

type Dependencies = Base & {
  findProfile: (args: { eventId: string; guestId: string }) => Promise<{ profile: ProfileDto; linkedin: string } | null>;
  withLockedProfile: (args: { userId: string; eventId: string; guestId: string }, decide: (snapshot: ProfileSnapshot) => ProfileDecision) => Promise<ProfileSaveResult & { linkedin: string }>;
};

const defaults: Dependencies = {
  findOrganizationId: eventRepository.findOrganizationId,
  requireCreator: requireEventCreator,
  findProfile: async (args) => (await import("./profile-repository")).findProfile(args),
  withLockedProfile: async (args, decide) => (await import("./profile-repository")).withLockedProfile(args, decide),
};

async function authorize(eventId: string, guestId: string, userId: string, dependencies: Base) {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (!uuidSchema.safeParse(guestId).success) throw new ApplicationError("NOT_FOUND", "Guest not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
}

export async function getGuestProfile(
  { userId, eventId, guestId }: { userId: string; eventId: string; guestId: string },
  dependencies: Dependencies = defaults,
): Promise<ProfileRead> {
  await authorize(eventId, guestId, userId, dependencies);
  const found = await dependencies.findProfile({ eventId, guestId });
  if (!found) throw new ApplicationError("NOT_FOUND", "Guest not found.");
  return toProfileRead(found.profile, found);
}

export async function saveGuestProfile(
  { userId, eventId, guestId, data }: { userId: string; eventId: string; guestId: string; data: unknown },
  dependencies: Dependencies = defaults,
): Promise<ProfileSaveResult & { read: ProfileRead }> {
  const parsed = profileInputSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the profile.", validationFields(parsed.error));
  await authorize(eventId, guestId, userId, dependencies);
  const result = await dependencies.withLockedProfile({ userId, eventId, guestId }, (snapshot) => decideProfileSave(snapshot, parsed.data));
  return { profile: result.profile, changed: result.changed, read: toProfileRead(result.profile, result) };
}
