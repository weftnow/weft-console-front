import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventStaff, events } from "@/infrastructure/database/schema/events";
import { organizationMemberships, users } from "@/infrastructure/database/schema/identity";
import { wefterEventContextSchema } from "../access-schemas";

export type EventAccessForActor = { organizationId: string; role: "owner" | "organizer" | "operator" | "wefter" };

export async function findEventAccessForActor(eventId: string, userId: string): Promise<EventAccessForActor | null> {
  const db = getDatabase();
  const [event] = await db.select({ organizationId: events.organizationId }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const [membership] = await db.select({ id: organizationMemberships.id, role: organizationMemberships.role, active: organizationMemberships.active })
    .from(organizationMemberships).where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, event.organizationId))).limit(1);
  if (!membership?.active) return null;
  if (membership.role === "owner" || membership.role === "organizer") return { organizationId: event.organizationId, role: membership.role };
  if (membership.role !== "staff") return null;
  const [grant] = await db.select({ consoleAccess: eventStaff.consoleAccess }).from(eventStaff)
    .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.organizationId, event.organizationId), eq(eventStaff.membershipId, membership.id))).limit(1);
  if (grant?.consoleAccess) return { organizationId: event.organizationId, role: grant.consoleAccess };
  return null;
}

export async function listGrantedEventsForUser(userId: string) {
  return getDatabase().select({
    eventId: events.id, organizationId: events.organizationId, eventName: events.name,
    venue: events.venue, accessMode: eventStaff.consoleAccess,
  }).from(eventStaff)
    .innerJoin(events, and(eq(events.id, eventStaff.eventId), eq(events.organizationId, eventStaff.organizationId)))
    .innerJoin(organizationMemberships, and(eq(organizationMemberships.id, eventStaff.membershipId), eq(organizationMemberships.organizationId, eventStaff.organizationId)))
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff"), inArray(eventStaff.consoleAccess, ["operator", "wefter"])))
    .orderBy(events.name);
}

export async function getWefterContext(eventId: string, userId: string) {
  const access = await findEventAccessForActor(eventId, userId);
  if (access?.role !== "wefter") return null;
  const [event] = await getDatabase().select({ id: events.id, name: events.name, venue: events.venue })
    .from(events).where(and(eq(events.id, eventId), eq(events.organizationId, access.organizationId))).limit(1);
  return event ? wefterEventContextSchema.parse({ eventId: event.id, name: event.name, venue: event.venue ?? "", accessMode: "wefter" }) : null;
}

export async function listEventAccess(eventId: string, userId: string) {
  const db = getDatabase();
  const [event] = await db.select({ organizationId: events.organizationId }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const [actor] = await db.select({ role: organizationMemberships.role, active: organizationMemberships.active })
    .from(organizationMemberships).where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, event.organizationId))).limit(1);
  if (!actor?.active || !["owner", "organizer"].includes(actor.role)) return null;
  return db.select({
    eventId: events.id, organizationId: events.organizationId, membershipId: organizationMemberships.id,
    accessMode: eventStaff.consoleAccess, revision: sql<number>`coalesce(${eventStaff.revision}, 0)`, memberName: users.displayName,
    role: organizationMemberships.role,
  }).from(events)
    .innerJoin(organizationMemberships, eq(organizationMemberships.organizationId, events.organizationId))
    .innerJoin(users, eq(organizationMemberships.userId, users.id))
    .leftJoin(eventStaff, and(eq(eventStaff.eventId, events.id), eq(eventStaff.membershipId, organizationMemberships.id)))
    .where(and(eq(events.id, eventId), eq(events.organizationId, event.organizationId), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff")))
    .orderBy(users.displayName).then((rows) => rows.map((row) => ({ ...row, revision: row.revision ?? 0, accessMode: row.accessMode ?? null, role: "staff" as const })));
}

export type SaveAccessResult = { kind: "saved"; value: NonNullable<Awaited<ReturnType<typeof listEventAccess>>>[number] } | { kind: "missing" } | { kind: "denied" } | { kind: "invalid-target" } | { kind: "conflict"; current: NonNullable<Awaited<ReturnType<typeof listEventAccess>>>[number] | null };

export async function saveEventAccess(input: { eventId: string; userId: string; membershipId: string; accessMode: "operator" | "wefter" | null; expectedRevision: number }): Promise<SaveAccessResult> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [initialEvent] = await tx.select({ organizationId: events.organizationId }).from(events).where(eq(events.id, input.eventId)).limit(1);
    if (!initialEvent) return { kind: "missing" };
    const [actorCandidate] = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships)
      .where(and(eq(organizationMemberships.userId, input.userId), eq(organizationMemberships.organizationId, initialEvent.organizationId))).limit(1);
    const idsToLock = [...new Set([input.membershipId, ...(actorCandidate ? [actorCandidate.id] : [])])].sort();
    const memberships = await tx.select({ id: organizationMemberships.id, userId: organizationMemberships.userId, role: organizationMemberships.role, active: organizationMemberships.active })
      .from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, initialEvent.organizationId), inArray(organizationMemberships.id, idsToLock)))
      .orderBy(organizationMemberships.id).for("update");
    const [event] = await tx.select({ organizationId: events.organizationId }).from(events).where(eq(events.id, input.eventId)).for("update").limit(1);
    if (!event) return { kind: "missing" };
    if (event.organizationId !== initialEvent.organizationId) return { kind: "missing" };
    const actor = memberships.find((membership) => membership.id === actorCandidate?.id);
    if (!actor?.active || !["owner", "organizer"].includes(actor.role)) return { kind: "denied" };
    const target = memberships.find((membership) => membership.id === input.membershipId);
    if (!target?.active || target.role !== "staff") return { kind: "invalid-target" };
    const [existing] = await tx.select().from(eventStaff).where(and(eq(eventStaff.eventId, input.eventId), eq(eventStaff.membershipId, input.membershipId))).for("update").limit(1);
    const current = existing ? {
      eventId: input.eventId, organizationId: event.organizationId, membershipId: target.id,
      accessMode: existing.consoleAccess, revision: existing.revision, memberName: "", role: "staff" as const,
    } : null;
    if ((existing?.revision ?? 0) !== input.expectedRevision) return { kind: "conflict", current };
    if (existing) {
      const [saved] = await tx.update(eventStaff).set({ consoleAccess: input.accessMode, availabilityWindows: input.accessMode === "wefter" ? existing.availabilityWindows : [], updatedBy: actor.userId, updatedAt: new Date(), revision: existing.revision + 1 })
        .where(and(eq(eventStaff.eventId, input.eventId), eq(eventStaff.membershipId, input.membershipId), eq(eventStaff.revision, input.expectedRevision)))
        .returning({ eventId: eventStaff.eventId, organizationId: eventStaff.organizationId, membershipId: eventStaff.membershipId, accessMode: eventStaff.consoleAccess, revision: eventStaff.revision });
      if (!saved) return { kind: "conflict", current };
      return { kind: "saved", value: { ...saved, memberName: "", role: "staff" } };
    }
    const [saved] = await tx.insert(eventStaff).values({ eventId: input.eventId, organizationId: event.organizationId, membershipId: input.membershipId, consoleAccess: input.accessMode, updatedBy: actor.userId, revision: 1 })
      .onConflictDoNothing().returning({ eventId: eventStaff.eventId, organizationId: eventStaff.organizationId, membershipId: eventStaff.membershipId, accessMode: eventStaff.consoleAccess, revision: eventStaff.revision });
    if (!saved) return { kind: "conflict", current: null };
    return { kind: "saved", value: { ...saved, memberName: "", role: "staff" } };
  });
}
