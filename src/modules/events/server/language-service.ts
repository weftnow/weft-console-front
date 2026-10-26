import "server-only";
import { requireEventCreator } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";
import { uuidSchema } from "../event-schemas";
import { eventLanguageUpdateSchema } from "../settings-schemas";
import * as repository from "./repository";
import { saveEventLanguage } from "./language-repository";

type Dependencies = {
  findOrganizationId: typeof repository.findOrganizationId;
  requireCreator: typeof requireEventCreator;
  save: typeof saveEventLanguage;
};
const defaults: Dependencies = { findOrganizationId: repository.findOrganizationId, requireCreator: requireEventCreator, save: saveEventLanguage };

/** Owners and Organizers of the event's organization change the language their matches are explained in. */
export async function updateEventLanguage(
  { userId, eventId, data }: { userId: string; eventId: string; data: unknown },
  dependencies: Dependencies = defaults,
) {
  if (!uuidSchema.safeParse(eventId).success) throw new ApplicationError("NOT_FOUND", "Event not found.");
  const organizationId = await dependencies.findOrganizationId(eventId);
  if (!organizationId) throw new ApplicationError("NOT_FOUND", "Event not found.");
  await dependencies.requireCreator({ userId, organizationId });
  const parsed = eventLanguageUpdateSchema.safeParse(data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Choose a supported language.", { language: "Choose English or Spanish." });
  const result = await dependencies.save({ eventId, userId, language: parsed.data.language });
  if (!result) throw new ApplicationError("NOT_FOUND", "Event not found.");
  return { language: parsed.data.language, changed: result.changed };
}
