import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import type { NetworkingSettings, TimeInterval } from "./settings-schemas";

export const eventFormErrorSchema = z.object({ error: z.object({
  message: z.string(), fields: z.record(z.string(), z.string()).optional(),
  details: z.object({ current: z.unknown().optional() }).passthrough().optional(),
}) });

export const settingLabels: Record<keyof NetworkingSettings, string> = {
  networkingWindows: "Networking hours", stopNewIntroductionsAt: "Last time for new introductions",
  landmarks: "Meeting places", softMaxIntroductionsPerGuest: "Suggested introductions per attendee",
  locationFreshnessMinutes: "Maximum age of location information",
  dispatchAcknowledgmentMinutes: "Time to acknowledge an assignment",
  missedMeetingMinutes: "Wait before marking a meeting as missed",
};

export function localEventTime(value: string | null, timezone: string) {
  if (!value) return "";
  const date = Temporal.Instant.from(value).toZonedDateTimeISO(timezone);
  return `${date.toPlainDate()}T${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}`;
}
export function eventTimeInstant(value: string, timezone: string) {
  if (!value) return "";
  return Temporal.ZonedDateTime.from(`${value}[${timezone}]`, { disambiguation: "reject" }).toInstant().toString();
}
export function describeIntervals(windows: TimeInterval[], timezone: string) {
  const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  return windows.map((window) => `${window.startsAt ? format.format(new Date(window.startsAt)) : "Start not set"} – ${window.endsAt ? format.format(new Date(window.endsAt)) : "End not set"}`).join("; ") || "Not set";
}
export function describeSetting(key: keyof NetworkingSettings, settings: NetworkingSettings, timezone: string) {
  if (key === "networkingWindows") return describeIntervals(settings.networkingWindows, timezone);
  if (key === "landmarks") return settings.landmarks.map((place) => [place.name || "Unnamed place", place.directions].filter(Boolean).join(" — ")).join("; ") || "Not set";
  if (key === "stopNewIntroductionsAt") return settings[key] ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(settings[key])) : "Not set";
  return settings[key] === null ? "Not set" : `${settings[key]}${key === "softMaxIntroductionsPerGuest" ? "" : " minutes"}`;
}
