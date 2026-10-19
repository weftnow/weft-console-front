import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { settingsUpdateSchema, wefterAssignmentSchema } from "../settings-schemas";
import * as repository from "./settings-repository";

type SettingsDependencies = Pick<typeof repository, "getSettings" | "saveSettings">;
type WefterDependencies = Pick<typeof repository, "listWefters" | "saveWefter">;

export async function readSettings(eventId: string, userId: string, deps: SettingsDependencies = repository) {
  const value = await deps.getSettings(eventId, userId);
  if (!value) throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  return value;
}
// Server-only consumer reads for F08/F09/F11/F12. Callers still authorize their
// own operation and must treat every missing value as blocking/unconfigured.
export async function getNetworkingConfiguration(eventId: string) {
  return repository.getNetworkingConfiguration(eventId);
}
export async function getAuthorizedWefters(eventId: string) {
  return repository.getAuthorizedWefters(eventId);
}
export async function updateSettings(eventId: string, userId: string, input: unknown, deps: SettingsDependencies = repository) {
  const parsed = settingsUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the event settings.", { settings: parsed.error.issues[0]?.message ?? "Enter valid settings." });
  const result = await deps.saveSettings({ eventId, userId, ...parsed.data });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  if (result.kind === "invalid-time") throw new ApplicationError("VALIDATION_ERROR", "Check the event time windows.", { networkingWindows: "Times must be within the event and windows cannot overlap." });
  if (result.kind === "conflict") throw new ApplicationError("CONFLICT", "These settings changed. Review the latest saved values.", undefined, { kind: "STALE_VERSION", current: await readSettings(eventId, userId, deps) });
  return readSettings(eventId, userId, deps);
}
export async function readWefters(eventId: string, userId: string, deps: WefterDependencies = repository) {
  const value = await deps.listWefters(eventId, userId);
  if (!value) throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  return value;
}
export async function updateWefter(eventId: string, membershipId: string, userId: string, input: unknown, deps: WefterDependencies = repository) {
  const parsed = wefterAssignmentSchema.safeParse(input);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the Wefter schedule.", { availabilityWindows: parsed.error.issues[0]?.message ?? "Enter valid schedule data." });
  const result = await deps.saveWefter({ eventId, membershipId, userId, ...parsed.data });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  if (result.kind === "invalid-target") throw new ApplicationError("VALIDATION_ERROR", "Only active local staff memberships can become Wefters.");
  if (result.kind === "invalid-time") throw new ApplicationError("VALIDATION_ERROR", "Check the availability intervals.", { availabilityWindows: "Intervals must be ordered, non-overlapping, and within the event dates." });
  if (result.kind === "conflict") throw new ApplicationError("CONFLICT", "This staff access or schedule changed. Review the latest saved value.", undefined, { kind: "STALE_VERSION", current: (await readWefters(eventId, userId, deps)).wefters.find((item) => item.membershipId === membershipId) ?? null });
  return (await readWefters(eventId, userId, deps)).wefters.find((item) => item.membershipId === membershipId) ?? null;
}
