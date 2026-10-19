import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import * as eventRepository from "@/modules/events/server/repository";
import { requireEventCreator } from "@/modules/organizations/service";
import type { MatchingStatusResult } from "../matching-status-schemas";
import { readEngineMatchingStatus } from "./matching-engine-client";
import { syncAfterFinishedRun } from "./match-sync-service";

type Dependencies = {
  findOrganizationId: typeof eventRepository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  readStatus: typeof readEngineMatchingStatus;
  /** Optional: pulls the match feed once for each newly finished run. */
  syncFinishedRun?: typeof syncAfterFinishedRun;
};
const defaults: Dependencies = {
  findOrganizationId: eventRepository.findOrganizationId,
  requireCreator: requireEventCreator,
  readStatus: readEngineMatchingStatus,
  syncFinishedRun: syncAfterFinishedRun,
};

/** Owners and Organizers of the event's organization only; the engine is asked for that organization's event. */
export async function getMatchingStatus(
  { userId, eventId }: { userId: string; eventId: string },
  dependencies: Dependencies = defaults,
): Promise<MatchingStatusResult> {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  const result = await dependencies.readStatus({ organizationId, eventId });
  if (result.availability === "available" && result.status.lastFinishedRunId && dependencies.syncFinishedRun) {
    await dependencies.syncFinishedRun({ organizationId, eventId, runId: result.status.lastFinishedRunId });
  }
  return result;
}
