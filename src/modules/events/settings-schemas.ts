import { z } from "zod";
import { uuidSchema } from "./event-schemas";

export const intervalSchema = z.strictObject({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() });
export const landmarkSchema = z.strictObject({ id: uuidSchema, name: z.string().trim().min(1).max(100), directions: z.string().trim().max(500).nullable() });
export const networkingSettingsSchema = z.strictObject({
  networkingWindows: z.array(intervalSchema).max(30),
  stopNewIntroductionsAt: z.iso.datetime().nullable(),
  landmarks: z.array(landmarkSchema).max(100),
  softMaxIntroductionsPerGuest: z.number().int().min(1).max(1000).nullable(),
  locationFreshnessMinutes: z.number().int().min(1).max(1440).nullable(),
  dispatchAcknowledgmentMinutes: z.number().int().min(1).max(1440).nullable(),
  missedMeetingMinutes: z.number().int().min(1).max(1440).nullable(),
});
export const settingsUpdateSchema = z.strictObject({ expectedRevision: z.number().int().min(0).max(2_147_483_646), settings: networkingSettingsSchema });
export const settingsDtoSchema = z.strictObject({ eventId: uuidSchema, revision: z.number().int().min(0), settings: networkingSettingsSchema, missing: z.array(z.string()), updatedAt: z.iso.datetime().nullable(), timezone: z.string() });
export const settingsResponseSchema = z.strictObject({ data: z.strictObject({ settings: settingsDtoSchema }) });

export const wefterAssignmentSchema = z.strictObject({ expectedRevision: z.number().int().min(0).max(2_147_483_646), availabilityWindows: z.array(intervalSchema).max(30), assigned: z.boolean() });
export const wefterDtoSchema = z.strictObject({ eventId: uuidSchema, organizationId: uuidSchema, membershipId: uuidSchema, memberName: z.string(), role: z.literal("staff"), accessMode: z.enum(["operator", "wefter"]).nullable(), revision: z.number().int().min(0), availabilityWindows: z.array(intervalSchema), updatedAt: z.iso.datetime().nullable() });
export const wefterCandidateSchema = z.strictObject({ membershipId: uuidSchema, memberName: z.string(), currentMode: z.enum(["operator", "wefter"]).nullable(), revision: z.number().int().min(0), assigned: z.boolean() });
export const wefterListResponseSchema = z.strictObject({ data: z.strictObject({ wefters: z.array(wefterDtoSchema), candidates: z.array(wefterCandidateSchema), timezone: z.string() }) });
export const wefterUpdateResponseSchema = z.strictObject({ data: z.strictObject({ wefter: wefterDtoSchema.nullable() }) });
export type NetworkingSettings = z.infer<typeof networkingSettingsSchema>;
export type TimeInterval = z.infer<typeof intervalSchema>;

export function scheduleIntervalsValid(intervals: TimeInterval[], startsAt: string, endsAt: string) {
  const sorted = [...intervals].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return sorted.every((item, index) => item.startsAt < item.endsAt && item.startsAt >= startsAt && item.endsAt <= endsAt && (index === 0 || sorted[index - 1]!.endsAt <= item.startsAt));
}

export function settingsTimesValid(settings: NetworkingSettings, startsAt: string, endsAt: string) {
  return scheduleIntervalsValid(settings.networkingWindows, startsAt, endsAt) && (!settings.stopNewIntroductionsAt || (settings.stopNewIntroductionsAt >= startsAt && settings.stopNewIntroductionsAt <= endsAt));
}
