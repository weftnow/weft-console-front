import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { requireEventCreator } from "@/modules/organizations/service";
import { uuidSchema } from "@/modules/events/event-schemas";
import * as eventRepository from "@/modules/events/server/repository";
import { canonicalPair } from "../networking-eligibility";
import { matchBlockInputSchema, participationInputSchema } from "../networking-schemas";
import type { MatchBlockInput, ParticipationDto, ParticipationInput } from "../networking-schemas";
import type {
  MatchBlockDecision, MatchBlockResult, MatchBlockSnapshot, NetworkingEvent, NetworkingMembership,
  ParticipationDecision, ParticipationResult, ParticipationSnapshot, RemoveBlockSnapshot,
} from "../networking-types";

/** Stale save: carries the latest saved participation so the client can show it. */
export class ParticipationConflictError extends ApplicationError {
  constructor(public readonly latest: ParticipationDto) {
    super("CONFLICT", "Someone else changed this guest. Review the latest state and try again.");
    this.name = "ParticipationConflictError";
  }
}

export function validationFields(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string> {
  return Object.fromEntries(error.issues.slice(0, 20).map((issue) => [issue.path.map(String).join(".") || "form", issue.message]));
}

export function requireOperator(event: NetworkingEvent, membership: NetworkingMembership) {
  if (!event) throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (!membership?.active || !["owner", "organizer"].includes(membership.role)) {
    throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization.");
  }
}

export function decideParticipationChange(snapshot: ParticipationSnapshot, input: ParticipationInput): ParticipationDecision {
  requireOperator(snapshot.event, snapshot.membership);
  if (!snapshot.guest) throw new ApplicationError("NOT_FOUND", "Guest not found.");
  if (snapshot.guest.status === input.status) return { kind: "noop", participation: snapshot.guest };
  if (snapshot.guest.version !== input.expectedVersion) throw new ParticipationConflictError(snapshot.guest);
  return { kind: "update", next: input, current: snapshot.guest };
}

export function decideMatchBlock(snapshot: MatchBlockSnapshot, input: MatchBlockInput): MatchBlockDecision {
  requireOperator(snapshot.event, snapshot.membership);
  const [a, b] = input.guestIds;
  if (a === b) throw new ApplicationError("VALIDATION_ERROR", "Check the guests.", { guestIds: "Choose two different guests." });
  if (!snapshot.knownGuestIds.has(a) || !snapshot.knownGuestIds.has(b)) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the guests.", { guestIds: "Both guests must be on this event." });
  }
  if (snapshot.existingBlock) return { kind: "existing", block: snapshot.existingBlock };
  return { kind: "create", pair: canonicalPair(a, b), reason: input.reason ?? null };
}

export function decideMatchBlockRemoval(snapshot: RemoveBlockSnapshot) {
  requireOperator(snapshot.event, snapshot.membership);
  if (!snapshot.block) throw new ApplicationError("NOT_FOUND", "Do-not-match pair not found.");
  return snapshot.block;
}

type Base = { findOrganizationId: typeof eventRepository.findOrganizationId; requireCreator: typeof requireEventCreator };

type Dependencies = Base & {
  withLockedParticipation: (args: { userId: string; eventId: string; guestId: string }, decide: (snapshot: ParticipationSnapshot) => ParticipationDecision) => Promise<ParticipationResult>;
  withLockedMatchBlock: (args: { userId: string; eventId: string; guestIds: [string, string] }, decide: (snapshot: MatchBlockSnapshot) => MatchBlockDecision) => Promise<MatchBlockResult>;
  withLockedBlockRemoval: (args: { userId: string; eventId: string; blockId: string }, decide: (snapshot: RemoveBlockSnapshot) => ReturnType<typeof decideMatchBlockRemoval>) => Promise<void>;
};

const defaults: Dependencies = {
  findOrganizationId: eventRepository.findOrganizationId,
  requireCreator: requireEventCreator,
  withLockedParticipation: async (args, decide) => (await import("./networking-repository")).withLockedParticipation(args, decide),
  withLockedMatchBlock: async (args, decide) => (await import("./networking-repository")).withLockedMatchBlock(args, decide),
  withLockedBlockRemoval: async (args, decide) => (await import("./networking-repository")).withLockedBlockRemoval(args, decide),
};

async function authorize(eventId: string, userId: string, dependencies: Base) {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
}

export async function updateGuestParticipation(
  { userId, eventId, guestId, data }: { userId: string; eventId: string; guestId: string; data: unknown },
  dependencies: Dependencies = defaults,
): Promise<ParticipationResult> {
  if (!uuidSchema.safeParse(guestId).success) throw new ApplicationError("NOT_FOUND", "Guest not found.");
  const parsed = participationInputSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the networking change.", validationFields(parsed.error));
  await authorize(eventId, userId, dependencies);
  return dependencies.withLockedParticipation({ userId, eventId, guestId }, (snapshot) => decideParticipationChange(snapshot, parsed.data));
}

export async function addMatchBlock(
  { userId, eventId, data }: { userId: string; eventId: string; data: unknown },
  dependencies: Dependencies = defaults,
): Promise<MatchBlockResult> {
  const parsed = matchBlockInputSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the guests.", validationFields(parsed.error));
  await authorize(eventId, userId, dependencies);
  return dependencies.withLockedMatchBlock({ userId, eventId, guestIds: parsed.data.guestIds }, (snapshot) => decideMatchBlock(snapshot, parsed.data));
}

export async function removeMatchBlock(
  { userId, eventId, blockId }: { userId: string; eventId: string; blockId: string },
  dependencies: Dependencies = defaults,
): Promise<void> {
  if (!uuidSchema.safeParse(blockId).success) throw new ApplicationError("NOT_FOUND", "Do-not-match pair not found.");
  await authorize(eventId, userId, dependencies);
  return dependencies.withLockedBlockRemoval({ userId, eventId, blockId }, decideMatchBlockRemoval);
}
