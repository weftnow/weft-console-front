import { Temporal } from "@js-temporal/polyfill";
import { EVENT_TIMEZONES } from "./event-options";
import type { CreateEventInput } from "./event-schemas";
import { ApplicationError } from "@/shared/lib/application-error";

export type EventSchedule = {
  timezone: string;
  startsAt: string;
  endsAt: string;
};

export function resolveEventSchedule(input: Pick<CreateEventInput, "city" | "startDate" | "endDate" | "startTime" | "endTime">): EventSchedule {
  const timezone = EVENT_TIMEZONES[input.city];
  const toInstant = (date: string, time: string | null, field: "startTime" | "endTime") => {
    const day = Temporal.PlainDate.from(date);
    const resolvedDay = field === "endTime" && time === null ? day.add({ days: 1 }) : day;
    const [hour, minute] = time ? time.split(":").map(Number) : [0, 0];
    try {
      return Temporal.ZonedDateTime.from({
        timeZone: timezone, year: resolvedDay.year, month: resolvedDay.month,
        day: resolvedDay.day, hour, minute,
      }, { disambiguation: "reject" }).toInstant().epochMilliseconds;
    } catch {
      throw new ApplicationError("VALIDATION_ERROR", "Check the event time.", {
        [field]: "This local time is ambiguous or does not exist in the selected city.",
      });
    }
  };
  const start = toInstant(input.startDate, input.startTime, "startTime");
  const end = toInstant(input.endDate, input.endTime, "endTime");
  if (end <= start) {
    throw new ApplicationError("VALIDATION_ERROR", "Check the event dates and times.", {
      endTime: "End time must be after the start time.",
    });
  }
  return { timezone, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
}

export function deriveScheduleStatus(startsAt: string, endsAt: string, now = new Date()): "upcoming" | "live" | "completed" {
  if (now.toISOString() < startsAt) return "upcoming";
  if (now.toISOString() >= endsAt) return "completed";
  return "live";
}
