import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import type { I18n } from "@/shared/i18n/i18n";
import type { NetworkingSettings, TimeInterval } from "./settings-schemas";

export const eventFormErrorSchema = z.object({ error: z.object({
  message: z.string(), fields: z.record(z.string(), z.string()).optional(),
  details: z.object({ current: z.unknown().optional() }).passthrough().optional(),
}) });

export function localEventTime(value: string | null, timezone: string) {
  if (!value) return "";
  const date = Temporal.Instant.from(value).toZonedDateTimeISO(timezone);
  return `${date.toPlainDate()}T${String(date.hour).padStart(2, "0")}:${String(date.minute).padStart(2, "0")}`;
}
export function eventTimeInstant(value: string, timezone: string) {
  if (!value) return "";
  return Temporal.ZonedDateTime.from(`${value}[${timezone}]`, { disambiguation: "reject" }).toInstant().toString();
}
export function describeIntervals(i18n: I18n, windows: TimeInterval[], timezone: string) {
  const copy = i18n.dict.events.form;
  const format = (value: string) => i18n.dateTime(value, timezone);
  return windows.map((window) => `${window.startsAt ? format(window.startsAt) : copy.startNotSet} – ${window.endsAt ? format(window.endsAt) : copy.endNotSet}`).join("; ") || copy.notSet;
}
export function describeSetting(i18n: I18n, key: keyof NetworkingSettings, settings: NetworkingSettings, timezone: string) {
  const copy = i18n.dict.events.form;
  if (key === "networkingWindows") return describeIntervals(i18n, settings.networkingWindows, timezone);
  if (key === "landmarks") return settings.landmarks.map((place) => [place.name || copy.unnamedPlace, place.directions].filter(Boolean).join(" — ")).join("; ") || copy.notSet;
  if (key === "stopNewIntroductionsAt") return settings[key] ? i18n.dateTime(settings[key], timezone) : copy.notSet;
  const value = settings[key];
  if (value === null) return copy.notSet;
  return key === "softMaxIntroductionsPerGuest" ? String(value) : i18n.t(copy.minutes, { value });
}
