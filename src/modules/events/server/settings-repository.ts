import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventNetworkingSettings, eventStaff, events } from "@/infrastructure/database/schema/events";
import { organizationMemberships, users } from "@/infrastructure/database/schema/identity";
import { settingsTimesValid, scheduleIntervalsValid, type NetworkingSettings, type TimeInterval } from "../settings-schemas";

export async function getSettings(eventId: string, userId: string) {
  const db = getDatabase();
  const [event] = await db.select({ organizationId: events.organizationId, timezone: events.timezone }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const [actor] = await db.select({ role: organizationMemberships.role, active: organizationMemberships.active }).from(organizationMemberships).where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, event.organizationId))).limit(1);
  if (!actor?.active || !["owner", "organizer"].includes(actor.role)) return null;
  const [row] = await db.select().from(eventNetworkingSettings).where(eq(eventNetworkingSettings.eventId, eventId)).limit(1);
  return { eventId, revision: row?.revision ?? 0, settings: row?.settings ?? emptySettings(), missing: missingSettings(row?.settings ?? emptySettings()), updatedAt: row?.updatedAt.toISOString() ?? null, timezone: event.timezone };
}

export function emptySettings(): NetworkingSettings { return { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null }; }
export function missingSettings(settings: NetworkingSettings) { return Object.entries(settings).filter(([, value]) => value === null || (Array.isArray(value) && value.length === 0)).map(([key]) => key); }

export async function getNetworkingConfiguration(eventId: string) {
  const db = getDatabase();
  const [event] = await db.select({ timezone: events.timezone }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const [row] = await db.select().from(eventNetworkingSettings).where(eq(eventNetworkingSettings.eventId, eventId)).limit(1);
  const settings = row?.settings ?? emptySettings();
  return { eventId, timezone: event.timezone, revision: row?.revision ?? 0, settings, missing: missingSettings(settings) };
}

export async function getAuthorizedWefters(eventId: string) {
  return getDatabase().select({ eventId: eventStaff.eventId, organizationId: eventStaff.organizationId, membershipId: eventStaff.membershipId, name: users.displayName, availabilityWindows: eventStaff.availabilityWindows })
    .from(eventStaff).innerJoin(events, and(eq(events.id, eventStaff.eventId), eq(events.organizationId, eventStaff.organizationId)))
    .innerJoin(organizationMemberships, and(eq(organizationMemberships.id, eventStaff.membershipId), eq(organizationMemberships.organizationId, eventStaff.organizationId)))
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.consoleAccess, "wefter"), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff")));
}

export async function saveSettings(input: { eventId: string; userId: string; expectedRevision: number; settings: NetworkingSettings }) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [initialEvent] = await tx.select({ organizationId: events.organizationId }).from(events).where(eq(events.id, input.eventId)).limit(1);
    if (!initialEvent) return { kind: "missing" as const };
    const [actor] = await tx.select({ id: organizationMemberships.id, userId: organizationMemberships.userId, role: organizationMemberships.role, active: organizationMemberships.active }).from(organizationMemberships).where(and(eq(organizationMemberships.userId, input.userId), eq(organizationMemberships.organizationId, initialEvent.organizationId))).for("update").limit(1);
    const [event] = await tx.select({ organizationId: events.organizationId, startsAt: events.startsAt, endsAt: events.endsAt }).from(events).where(eq(events.id, input.eventId)).for("update").limit(1);
    if (!event) return { kind: "missing" as const };
    if (event.organizationId !== initialEvent.organizationId || !actor?.active || !["owner", "organizer"].includes(actor.role)) return { kind: "denied" as const };
    const [existing] = await tx.select().from(eventNetworkingSettings).where(eq(eventNetworkingSettings.eventId, input.eventId)).for("update").limit(1);
    if ((existing?.revision ?? 0) !== input.expectedRevision) return { kind: "conflict" as const };
    if (!settingsTimesValid(input.settings, event.startsAt.toISOString(), event.endsAt.toISOString())) return { kind: "invalid-time" as const };
    const updatedBy = actor.userId;
    const now = new Date();
    if (existing) await tx.update(eventNetworkingSettings).set({ settings: input.settings, revision: existing.revision + 1, updatedBy, updatedAt: now }).where(and(eq(eventNetworkingSettings.eventId, input.eventId), eq(eventNetworkingSettings.revision, input.expectedRevision)));
    else await tx.insert(eventNetworkingSettings).values({ eventId: input.eventId, settings: input.settings, revision: 1, updatedBy });
    return { kind: "saved" as const };
  });
}

export async function listWefters(eventId: string, userId: string) {
  const db = getDatabase();
  const [event] = await db.select({ organizationId: events.organizationId, timezone: events.timezone }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return null;
  const [actor] = await db.select({ role: organizationMemberships.role, active: organizationMemberships.active }).from(organizationMemberships).where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, event.organizationId))).limit(1);
  if (!actor?.active || !["owner", "organizer"].includes(actor.role)) return null;
  const candidates = await db.select({ membershipId: organizationMemberships.id, memberName: users.displayName, currentMode: eventStaff.consoleAccess, revision: sql<number>`coalesce(${eventStaff.revision}, 0)` })
    .from(organizationMemberships).innerJoin(users, eq(users.id, organizationMemberships.userId))
    .leftJoin(eventStaff, and(eq(eventStaff.eventId, eventId), eq(eventStaff.membershipId, organizationMemberships.id)))
    .where(and(eq(organizationMemberships.organizationId, event.organizationId), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff"))).orderBy(users.displayName);
  const wefters = await db.select({ eventId: eventStaff.eventId, organizationId: eventStaff.organizationId, membershipId: eventStaff.membershipId, memberName: users.displayName, role: organizationMemberships.role, accessMode: eventStaff.consoleAccess, revision: eventStaff.revision, availabilityWindows: eventStaff.availabilityWindows, updatedAt: eventStaff.updatedAt })
    .from(eventStaff).innerJoin(organizationMemberships, and(eq(organizationMemberships.id, eventStaff.membershipId), eq(organizationMemberships.organizationId, eventStaff.organizationId))).innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.organizationId, event.organizationId), eq(eventStaff.consoleAccess, "wefter"), eq(organizationMemberships.active, true)));
  return { wefters: wefters.map((item) => ({ ...item, role: "staff" as const, updatedAt: item.updatedAt.toISOString() })), candidates: candidates.map((item) => ({ ...item, revision: item.revision ?? 0, assigned: item.currentMode === "wefter" })), timezone: event.timezone };
}

export async function saveWefter(input: { eventId: string; membershipId: string; userId: string; expectedRevision: number; assigned: boolean; availabilityWindows: TimeInterval[] }) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [initial] = await tx.select({ organizationId: events.organizationId, startsAt: events.startsAt, endsAt: events.endsAt }).from(events).where(eq(events.id, input.eventId)).limit(1);
    if (!initial) return { kind: "missing" as const };
    const [actorCandidate] = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships).where(and(eq(organizationMemberships.userId, input.userId), eq(organizationMemberships.organizationId, initial.organizationId))).limit(1);
    const ids = [...new Set([input.membershipId, ...(actorCandidate ? [actorCandidate.id] : [])])].sort();
    const members = await tx.select({ id: organizationMemberships.id, userId: organizationMemberships.userId, role: organizationMemberships.role, active: organizationMemberships.active }).from(organizationMemberships).where(and(eq(organizationMemberships.organizationId, initial.organizationId), inArray(organizationMemberships.id, ids))).orderBy(organizationMemberships.id).for("update");
    const [event] = await tx.select({ organizationId: events.organizationId, startsAt: events.startsAt, endsAt: events.endsAt }).from(events).where(eq(events.id, input.eventId)).for("update").limit(1);
    const actor = members.find((m) => m.id === actorCandidate?.id), target = members.find((m) => m.id === input.membershipId);
    if (!event || event.organizationId !== initial.organizationId) return { kind: "missing" as const };
    if (!actor?.active || !["owner", "organizer"].includes(actor.role)) return { kind: "denied" as const };
    if (!target?.active || target.role !== "staff") return { kind: "invalid-target" as const };
    const [existing] = await tx.select().from(eventStaff).where(and(eq(eventStaff.eventId, input.eventId), eq(eventStaff.membershipId, input.membershipId))).for("update").limit(1);
    if ((existing?.revision ?? 0) !== input.expectedRevision) return { kind: "conflict" as const };
    if (!scheduleIntervalsValid(input.availabilityWindows, event.startsAt.toISOString(), event.endsAt.toISOString())) return { kind: "invalid-time" as const };
    const mode = input.assigned ? "wefter" : null;
    if (existing) await tx.update(eventStaff).set({ consoleAccess: mode, availabilityWindows: input.assigned ? input.availabilityWindows : [], revision: existing.revision + 1, updatedBy: actor.userId, updatedAt: new Date() }).where(and(eq(eventStaff.eventId, input.eventId), eq(eventStaff.membershipId, input.membershipId), eq(eventStaff.revision, input.expectedRevision)));
    else if (input.assigned) await tx.insert(eventStaff).values({ eventId: input.eventId, organizationId: event.organizationId, membershipId: input.membershipId, consoleAccess: "wefter", availabilityWindows: input.availabilityWindows, revision: 1, updatedBy: actor.userId });
    return { kind: "saved" as const };
  });
}

export async function getOwnWefterHours(eventId: string, userId: string) {
  const db = getDatabase();
  const [row] = await db.select({ membershipId: organizationMemberships.id, eventId: events.id, name: events.name, venue: events.venue, timezone: events.timezone, availabilityWindows: eventStaff.availabilityWindows })
    .from(events).innerJoin(organizationMemberships, and(eq(organizationMemberships.organizationId, events.organizationId), eq(organizationMemberships.userId, userId), eq(organizationMemberships.active, true), eq(organizationMemberships.role, "staff")))
    .innerJoin(eventStaff, and(eq(eventStaff.eventId, events.id), eq(eventStaff.organizationId, events.organizationId), eq(eventStaff.membershipId, organizationMemberships.id), eq(eventStaff.consoleAccess, "wefter")))
    .where(eq(events.id, eventId)).limit(1);
  return row ? { eventId: row.eventId, name: row.name, venue: row.venue ?? "", timezone: row.timezone, availabilityWindows: row.availabilityWindows } : null;
}
