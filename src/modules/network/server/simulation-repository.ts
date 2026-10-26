import "server-only";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventGuests, eventMatchBlocks, eventMatchingChanges } from "@/infrastructure/database/schema/events";

export type SimulatedChange = { id: string; kind: string; guestIds: string[]; createdAt: Date };
export type SimulatedGuest = { id: string; normalizedEmail: string; profileVersion: number; networkingStatus: "included" | "excluded" };

/** When the event's most recent networking change was saved, whatever its kind; null when nothing was ever saved. */
export async function latestChangeAt(eventId: string): Promise<Date | null> {
  const [row] = await getDatabase().select({ at: max(eventMatchingChanges.createdAt) })
    .from(eventMatchingChanges).where(eq(eventMatchingChanges.eventId, eventId));
  return row?.at ?? null;
}

/** The append-only change log in a stable order; a change's position is its ordinal. */
export async function listChanges(eventId: string): Promise<SimulatedChange[]> {
  return getDatabase().select({
    id: eventMatchingChanges.id, kind: eventMatchingChanges.kind, guestIds: eventMatchingChanges.guestIds, createdAt: eventMatchingChanges.createdAt,
  }).from(eventMatchingChanges).where(eq(eventMatchingChanges.eventId, eventId))
    .orderBy(asc(eventMatchingChanges.createdAt), asc(eventMatchingChanges.id));
}

export async function findGuestsByEmails(eventId: string, emails: readonly string[]): Promise<SimulatedGuest[]> {
  if (emails.length === 0) return [];
  const rows = await getDatabase().select({
    id: eventGuests.id, normalizedEmail: eventGuests.normalizedEmail, profileVersion: eventGuests.profileVersion, networkingStatus: eventGuests.networkingStatus,
  }).from(eventGuests).where(and(eq(eventGuests.eventId, eventId), inArray(eventGuests.normalizedEmail, [...emails])));
  return rows.flatMap((row) => (row.normalizedEmail ? [{ ...row, normalizedEmail: row.normalizedEmail }] : []));
}

/** Do-not-match pairs (low, high) among the given guests. */
export async function listBlockedPairs(eventId: string, guestIds: readonly string[]): Promise<[string, string][]> {
  if (guestIds.length === 0) return [];
  const rows = await getDatabase().select({ low: eventMatchBlocks.guestLowId, high: eventMatchBlocks.guestHighId })
    .from(eventMatchBlocks).where(and(eq(eventMatchBlocks.eventId, eventId), inArray(eventMatchBlocks.guestLowId, [...guestIds])));
  return rows.map((row) => [row.low, row.high]);
}
