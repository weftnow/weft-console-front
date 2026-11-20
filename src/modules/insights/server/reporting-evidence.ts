import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { eventGuests, eventOutcomesTracking, eventReportingEvidence, events } from "@/infrastructure/database/schema/events";
import { organizationMemberships } from "@/infrastructure/database/schema/identity";
import { uuidSchema } from "@/modules/events/event-schemas";
import { matchingEngineMode } from "@/modules/network/server/engine-mode";
import { canCreateEvent } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";
import { reportingEvidenceSchema, type EvidenceDocument, type ReportEvent, type ReportsPageModel } from "../reporting-contract";
import { parseEvidence, scopeEvidence } from "./reporting-evidence-validation";
import { readEventRecords, type ReportingTransaction } from "./reporting-records";

type OrganizationScope = { userId: string; organizationId: string };
type EventScope = OrganizationScope & { eventId: string };
const snapshot = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

function forbidden() {
  return new ApplicationError("FORBIDDEN", "Organizer access is required for reporting.");
}

function missingEvent() {
  return new ApplicationError("NOT_FOUND", "Event not found.");
}

function validateScope(scope: OrganizationScope) {
  if (!uuidSchema.safeParse(scope.userId).success || !uuidSchema.safeParse(scope.organizationId).success) throw forbidden();
}

function validateEventId(id: string) {
  if (!uuidSchema.safeParse(id).success) throw missingEvent();
}

async function requireOrganizer(tx: ReportingTransaction, scope: OrganizationScope, write = false) {
  const membership = tx.select({ active: organizationMemberships.active, role: organizationMemberships.role })
    .from(organizationMemberships).where(and(
      eq(organizationMemberships.organizationId, scope.organizationId), eq(organizationMemberships.userId, scope.userId),
    ));
  const [actor] = await (write ? membership.for("share") : membership);
  if (!canCreateEvent(actor ?? null)) throw forbidden();
}

async function requireEvent(tx: ReportingTransaction, scope: EventScope, write = false) {
  // The same membership-then-event lock order protects roster links, matching feed updates, and confirmations.
  await requireOrganizer(tx, scope, write);
  const event = tx.select({ id: events.id }).from(events)
    .where(and(eq(events.organizationId, scope.organizationId), eq(events.id, scope.eventId)));
  const [found] = await (write ? event.for("update") : event);
  if (!found) throw missingEvent();
  return found.id;
}

async function readDocument(tx: ReportingTransaction, eventId: string): Promise<EvidenceDocument> {
  const [row] = await tx.select({ revision: eventReportingEvidence.revision, evidence: eventReportingEvidence.evidence })
    .from(eventReportingEvidence).where(eq(eventReportingEvidence.eventId, eventId));
  return { revision: row?.revision ?? 0, evidence: reportingEvidenceSchema.parse(row ? row.evidence : {}) };
}

async function readPriorNetworkKeys(tx: ReportingTransaction, organizationId: string, before: Date, keys: string[]) {
  if (keys.length === 0) return [];
  const { rows } = await tx.execute<{ key: string }>(sql`
    select distinct (p.value ->> 'networkKey') as key
    from ${eventReportingEvidence} r
    join ${events} e on e.id = r.event_id
    cross join lateral jsonb_array_elements(r.evidence -> 'participants') as p(value)
    where e.organization_id = ${organizationId} and e.ends_at <= ${before.toISOString()}::timestamptz
      and p.value -> 'attended' = 'true'::jsonb
      and (p.value ->> 'networkKey') = any(${sql.param(keys)}::text[])
      and exists (select 1 from ${eventGuests} g where g.event_id = e.id and g.person_id = (p.value ->> 'personId')::uuid)
  `);
  return rows.map(({ key }) => key);
}

export async function getReportingEvidence(scope: EventScope): Promise<EvidenceDocument> {
  validateScope(scope);
  validateEventId(scope.eventId);
  return getDatabase().transaction(async (tx) => readDocument(tx, await requireEvent(tx, scope)), snapshot);
}

export async function saveReportingEvidence(
  scope: EventScope & { expectedRevision: number; evidence: unknown },
): Promise<EvidenceDocument> {
  validateScope(scope);
  validateEventId(scope.eventId);
  if (!Number.isSafeInteger(scope.expectedRevision) || scope.expectedRevision < 0 || scope.expectedRevision > 2147483647) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the evidence revision.", { expectedRevision: "Enter a valid revision." });
  }
  const evidence = parseEvidence(scope.evidence);
  return getDatabase().transaction(async (tx) => {
    const eventId = await requireEvent(tx, scope, true);
    if (matchingEngineMode() === "simulation") {
      throw new ApplicationError("CONFLICT", "Reporting evidence cannot be changed during simulation.", undefined, { kind: "SIMULATION_ACTIVE" });
    }
    const current = await readDocument(tx, eventId);
    if (current.revision !== scope.expectedRevision) {
      throw new ApplicationError("CONFLICT", "Reporting evidence changed. Review the latest revision.", undefined, { kind: "STALE_VERSION", current });
    }
    const records = await readEventRecords(tx, [eventId]);
    const values = {
      revision: current.revision + 1, evidence: scopeEvidence(evidence, records.get(eventId)!, "write"), updatedBy: scope.userId,
    };
    const [saved] = await tx.insert(eventReportingEvidence).values({ ...values, eventId }).onConflictDoUpdate({
      target: eventReportingEvidence.eventId, set: { ...values, updatedAt: sql`clock_timestamp()` },
    }).returning({ revision: eventReportingEvidence.revision, evidence: eventReportingEvidence.evidence });
    return { revision: saved.revision, evidence: reportingEvidenceSchema.parse(saved.evidence) };
  });
}

export async function readReportingSources(
  scope: OrganizationScope, selection: { eventId?: string; across: boolean },
): Promise<{ events: ReportsPageModel["events"]; sources: ReportEvent[]; selectedEventId?: string }> {
  validateScope(scope);
  if (selection.eventId !== undefined) validateEventId(selection.eventId);
  if (typeof selection.across !== "boolean") throw new ApplicationError("VALIDATION_ERROR", "Choose a reporting scope.");
  return getDatabase().transaction(async (tx) => {
    await requireOrganizer(tx, scope);
    const all = await tx.select({
      id: events.id, name: events.name, startsAt: events.startsAt, endsAt: events.endsAt, timezone: events.timezone,
      ended: sql<boolean>`${events.endsAt} <= current_timestamp`, upcoming: sql<boolean>`${events.startsAt} > current_timestamp`,
      trackingStartedAt: eventOutcomesTracking.startedAt,
    }).from(events).leftJoin(eventOutcomesTracking, eq(eventOutcomesTracking.eventId, events.id))
      .where(eq(events.organizationId, scope.organizationId)).orderBy(desc(events.endsAt), events.id);
    const options = all.map(({ id, name, endsAt }) => ({ id, name, endsAt: endsAt.toISOString() }));
    const ended = all.filter((event) => event.ended);
    let selected;
    if (selection.eventId !== undefined) {
      const id = selection.eventId.toLowerCase();
      selected = all.find((event) => event.id === id);
      if (!selected) throw missingEvent();
    } else {
      selected = ended[0] ?? all.filter((event) => event.upcoming).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? all[0];
    }
    if (!selected) return { events: options, sources: [] };
    const sourceEvents = selection.across ? ended.reverse() : [selected];
    const ids = sourceEvents.map((event) => event.id);
    const records = await readEventRecords(tx, ids);
    const documents = ids.length ? await tx.select({ id: eventReportingEvidence.eventId, evidence: eventReportingEvidence.evidence })
      .from(eventReportingEvidence).where(sql`${eventReportingEvidence.eventId} = any(${sql.param(ids)}::uuid[])`) : [];
    const evidenceByEvent = new Map(documents.map((doc) => [doc.id, reportingEvidenceSchema.parse(doc.evidence)]));
    const selectedEvidence = evidenceByEvent.get(selected.id);
    const priorNetworkKeys = selection.across ? undefined : await readPriorNetworkKeys(tx, scope.organizationId, selected.startsAt,
      (selectedEvidence?.participants ?? []).flatMap((p) => p.networkKey && p.attended === true ? [p.networkKey] : []));
    const sources = sourceEvents.map(({ id, name, startsAt, endsAt, timezone, trackingStartedAt }) => {
      const data = records.get(id)!;
      const evidence = evidenceByEvent.get(id);
      return {
        id, name, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timezone,
        trackingStartedAt: trackingStartedAt?.toISOString() ?? null, ...data,
        ...(priorNetworkKeys ? { priorNetworkKeys } : {}),
        evidence: evidence ? scopeEvidence(evidence, data, "read") : null,
      };
    });
    return { events: options, sources, selectedEventId: selected.id };
  }, snapshot);
}
