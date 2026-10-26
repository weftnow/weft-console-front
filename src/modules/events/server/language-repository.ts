import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { events } from "@/infrastructure/database/schema/events";
import { recordChange } from "@/modules/attendees/server/networking-repository";
import type { Locale } from "@/shared/i18n/locales";

/**
 * Set the event language and, only when it changed, record the matching change in the same
 * transaction so the engine runs again. The caller has already authorized the actor.
 */
export async function saveEventLanguage(input: { eventId: string; userId: string; language: Locale }): Promise<{ changed: boolean } | null> {
  return getDatabase().transaction(async (tx) => {
    const [event] = await tx.select({ language: events.language }).from(events).where(eq(events.id, input.eventId)).for("update").limit(1);
    if (!event) return null;
    if (event.language === input.language) return { changed: false };
    await tx.update(events).set({ language: input.language, updatedAt: new Date() }).where(eq(events.id, input.eventId));
    await recordChange(tx, { eventId: input.eventId, actorId: input.userId, guestIds: [], kind: "event_language_changed", reason: null });
    return { changed: true };
  });
}
