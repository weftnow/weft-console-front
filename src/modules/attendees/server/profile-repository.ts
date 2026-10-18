import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventGuestProfileVersions, eventGuests } from "@/infrastructure/database/schema/events";
import { users } from "@/infrastructure/database/schema/identity";
import { ORGANIZER_ONLY_FIELDS } from "../profile-schemas";
import type { OrganizerOnlyFieldKey, ProfileDto } from "../profile-schemas";
import type { ProfileDecision, ProfileSaveResult, ProfileSnapshot } from "../profile-types";
import { lockOperator, recordChange } from "./networking-repository";
import type { Tx } from "./networking-repository";

type VersionRow = typeof eventGuestProfileVersions.$inferSelect;
type Reader = Pick<Tx, "select">;

function emptyProfile(guestId: string): ProfileDto {
  return {
    guestId, version: 0, savedAt: null, savedBy: null, organizerOnly: [],
    fields: { summary: null, goals: null, offers: null, desiredConnections: null, avoid: null, background: null, linkedinDetails: null, missingDetails: null },
  };
}

export function toProfileDto(row: VersionRow, savedBy: string | null): ProfileDto {
  const hidden = new Set(row.organizerOnlyFields);
  return {
    guestId: row.guestId, version: row.version, savedAt: row.createdAt.toISOString(), savedBy,
    organizerOnly: ORGANIZER_ONLY_FIELDS.filter((key: OrganizerOnlyFieldKey) => hidden.has(key)),
    fields: {
      summary: row.summary, goals: row.goals, offers: row.offers, desiredConnections: row.desiredConnections,
      avoid: row.avoid, background: row.background, linkedinDetails: row.linkedinDetails, missingDetails: row.missingDetails,
    },
  };
}

async function loadCurrent(reader: Reader, guest: { id: string; eventId: string; profileVersion: number }): Promise<ProfileDto> {
  if (guest.profileVersion === 0) return emptyProfile(guest.id);
  const [row] = await reader.select({ version: eventGuestProfileVersions, savedBy: users.displayName })
    .from(eventGuestProfileVersions)
    .innerJoin(users, eq(users.id, eventGuestProfileVersions.createdBy))
    .where(and(
      eq(eventGuestProfileVersions.guestId, guest.id), eq(eventGuestProfileVersions.eventId, guest.eventId),
      eq(eventGuestProfileVersions.version, guest.profileVersion),
    )).limit(1);
  if (!row) throw new Error("A guest points at a profile version that does not exist.");
  return toProfileDto(row.version, row.savedBy);
}

export async function findProfile({ eventId, guestId }: { eventId: string; guestId: string }): Promise<{ profile: ProfileDto; linkedin: string } | null> {
  const database = getDatabase();
  const [guest] = await database.select({ id: eventGuests.id, eventId: eventGuests.eventId, profileVersion: eventGuests.profileVersion, linkedin: eventGuests.linkedin })
    .from(eventGuests).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId))).limit(1);
  return guest ? { profile: await loadCurrent(database, guest), linkedin: guest.linkedin } : null;
}

/** Same lock order as networking changes: membership, event, then the guest row. */
export async function withLockedProfile(
  { userId, eventId, guestId }: { userId: string; eventId: string; guestId: string },
  decide: (snapshot: ProfileSnapshot) => ProfileDecision,
): Promise<ProfileSaveResult & { linkedin: string }> {
  return getDatabase().transaction(async (tx) => {
    const { membership, event } = await lockOperator(tx, userId, eventId);
    const [guest] = event
      ? await tx.select({ id: eventGuests.id, eventId: eventGuests.eventId, profileVersion: eventGuests.profileVersion, linkedin: eventGuests.linkedin })
        .from(eventGuests).where(and(eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId))).for("update").limit(1)
      : [];
    const decision = decide({ membership, event, profile: guest ? await loadCurrent(tx, guest) : null });
    if (decision.kind === "noop") return { profile: decision.profile, changed: false, linkedin: guest.linkedin };

    const version = decision.current.version + 1;
    const { fields } = decision.next;
    const [saved] = await tx.insert(eventGuestProfileVersions).values({
      eventId, guestId, version, createdBy: userId,
      summary: fields.summary, goals: fields.goals, offers: fields.offers, desiredConnections: fields.desiredConnections,
      avoid: fields.avoid, background: fields.background, linkedinDetails: fields.linkedinDetails, missingDetails: fields.missingDetails,
      organizerOnlyFields: decision.next.organizerOnly,
    }).returning();
    const [updated] = await tx.update(eventGuests).set({ profileVersion: version, updatedAt: new Date() }).where(and(
      eq(eventGuests.id, guestId), eq(eventGuests.eventId, eventId), eq(eventGuests.profileVersion, decision.current.version),
    )).returning({ id: eventGuests.id });
    if (!updated) throw new Error("A locked guest row changed during a profile save.");
    await recordChange(tx, { eventId, actorId: userId, guestIds: [guestId], kind: "profile_updated", reason: null });
    const [actor] = await tx.select({ name: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
    return { profile: toProfileDto(saved, actor?.name ?? null), changed: true, linkedin: guest.linkedin };
  });
}
