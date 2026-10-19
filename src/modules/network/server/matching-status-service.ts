import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "@/modules/events/event-schemas";
import * as eventRepository from "@/modules/events/server/repository";
import { requireEventCreator } from "@/modules/organizations/service";
import type { MatchingStatusResult } from "../matching-status-schemas";
import { readEngineMatchingStatus } from "./matching-engine-client";

type Dependencies = {
  findOrganizationId: typeof eventRepository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  readStatus: typeof readEngineMatchingStatus;
};
const defaults: Dependencies = {
  findOrganizationId: eventRepository.findOrganizationId,
  requireCreator: requireEventCreator,
  readStatus: readEngineMatchingStatus,
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
  return dependencies.readStatus({ organizationId, eventId });
}
