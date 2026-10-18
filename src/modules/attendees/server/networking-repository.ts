import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationMemberships } from "@/infrastructure/database/schema/identity";
import { eventGuests, eventMatchBlocks, eventMatchingChanges, events } from "@/infrastructure/database/schema/events";
import type { MatchBlockDto, ParticipationDto } from "../networking-schemas";
import type {
  MatchBlockDecision, MatchBlockResult, MatchBlockSnapshot, NetworkingEvent, NetworkingMembership,
  ParticipationDecision, ParticipationResult, ParticipationSnapshot, RemoveBlockSnapshot,
} from "../networking-types";

type Database = ReturnType<typeof getDatabase>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function toParticipationDto(guest: typeof eventGuests.$inferSelect): ParticipationDto {
  return {
    guestId: guest.id,
    status: guest.networkingStatus,
    excludedAt: guest.networkingExcludedAt?.toISOString() ?? null,
    reason: guest.networkingExclusionReason,
    version: guest.networkingVersion,
  };
}

export function toMatchBlockDto(block: typeof eventMatchBlocks.$inferSelect): MatchBlockDto {
  return {
    id: block.id,
    guestIds: [block.guestLowId, block.guestHighId],
    reason: block.reason,
    createdAt: block.createdAt.toISOString(),
  };
}

/** Same lock order as attendee imports: membership, then event. Callers lock guest rows afterwards. */
async function lockOperator(tx: Tx, userId: string, eventId: string): Promise<{ membership: NetworkingMembership; event: NetworkingEvent }> {
  const [initialEvent] = await tx.select({ organizationId: events.organizationId })
    .from(events).where(eq(events.id, eventId)).limit(1);
  if (!initialEvent) return { membership: null, event: null };
  const [membership] = await tx.select({ active: organizationMemberships.active, role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, initialEvent.organizationId)))
    .for("update").limit(1);
  const [lockedEvent] = await tx.select({ id: events.id, organizationId: events.organizationId })
    .from(events).where(eq(events.id, eventId)).for("update").limit(1);
  if (!lockedEvent || lockedEvent.organizationId !== initialEvent.organizationId) return { membership: membership ?? null, event: null };
  return { membership: membership ?? null, event: { id: lockedEvent.id, organizationId: lockedEvent.organizationId } };
}

async function recordChange(tx: Tx, change: typeof eventMatchingChanges.$inferInsert) {
  await tx.insert(eventMatchingChanges).values(change);
  await tx.update(events).set({ updatedAt: new Date() }).where(eq(events.id, change.eventId));
}

export async function withLockedParticipation(
  { userId, eventId, guestId }: { userId: string; eventId: string; guestId: string },
  decide: (snapshot: ParticipationSnapshot) => ParticipationDecision,
): Promise<ParticipationResult> {
  return getDatabase().transaction(async (tx) => {
    const { membership, event } = await lockOperator(tx, userId, eventId);
    const [guest] = event
      ? await tx.select().from(eventGuests).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId))).for("update").limit(1)
      : [];
    const decision = decide({ membership, event, guest: guest ? toParticipationDto(guest) : null });
    if (decision.kind === "noop") return { participation: decision.participation, changed: false };

    const now = new Date();
    const excluding = decision.next.status === "excluded";
    const [updated] = await tx.update(eventGuests).set({
      networkingStatus: decision.next.status,
      networkingExcludedAt: excluding ? now : null,
      networkingExcludedBy: excluding ? userId : null,
      networkingExclusionReason: decision.next.status === "excluded" ? decision.next.reason : null,
      networkingVersion: decision.current.version + 1,
      updatedAt: now,
    }).where(and(
      eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId),
      eq(eventGuests.networkingVersion, decision.current.version),
    )).returning();
    if (!updated) throw new Error("A locked guest row changed during a networking update.");
    await recordChange(tx, {
      eventId, actorId: userId, guestIds: [guestId],
      kind: excluding ? "guest_excluded" : "guest_restored",
      reason: decision.next.status === "excluded" ? decision.next.reason : null,
    });
    return { participation: toParticipationDto(updated), changed: true };
  });
}

export async function withLockedMatchBlock(
  { userId, eventId, guestIds }: { userId: string; eventId: string; guestIds: [string, string] },
  decide: (snapshot: MatchBlockSnapshot) => MatchBlockDecision,
): Promise<MatchBlockResult> {
  return getDatabase().transaction(async (tx) => {
    const { membership, event } = await lockOperator(tx, userId, eventId);
    const [low, high] = guestIds[0] < guestIds[1] ? guestIds : [guestIds[1], guestIds[0]];
    const known = event
      ? await tx.select({ id: eventGuests.id }).from(eventGuests)
        .where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.id, [low, high])))
        .orderBy(eventGuests.id).for("update")
      : [];
    const [existing] = event && known.length === 2
      ? await tx.select().from(eventMatchBlocks).where(and(
        eq(eventMatchBlocks.eventId, eventId), eq(eventMatchBlocks.guestLowId, low), eq(eventMatchBlocks.guestHighId, high),
      )).limit(1)
      : [];
    const decision = decide({
      membership, event,
      knownGuestIds: new Set(known.map((row) => row.id)),
      existingBlock: existing ? toMatchBlockDto(existing) : null,
    });
    if (decision.kind === "existing") return { matchBlock: decision.block, created: false };

    const [created] = await tx.insert(eventMatchBlocks).values({
      eventId, guestLowId: decision.pair[0], guestHighId: decision.pair[1],
      reason: decision.reason, createdBy: userId,
    }).returning();
    await recordChange(tx, { eventId, actorId: userId, guestIds: decision.pair, kind: "match_block_added", reason: decision.reason });
    return { matchBlock: toMatchBlockDto(created), created: true };
  });
}

export async function withLockedBlockRemoval(
  { userId, eventId, blockId }: { userId: string; eventId: string; blockId: string },
  decide: (snapshot: RemoveBlockSnapshot) => MatchBlockDto,
): Promise<void> {
  await getDatabase().transaction(async (tx) => {
    const { membership, event } = await lockOperator(tx, userId, eventId);
    const [block] = event
      ? await tx.select().from(eventMatchBlocks)
        .where(and(eq(eventMatchBlocks.id, blockId), eq(eventMatchBlocks.eventId, eventId))).for("update").limit(1)
      : [];
    const target = decide({ membership, event, block: block ? toMatchBlockDto(block) : null });
    await tx.delete(eventMatchBlocks).where(eq(eventMatchBlocks.id, target.id));
    await recordChange(tx, { eventId, actorId: userId, guestIds: [...target.guestIds], kind: "match_block_removed", reason: null });
  });
}
