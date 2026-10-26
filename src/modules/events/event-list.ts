import type { CityArt } from "@/shared/ui/city-artwork";
import type { EventSummaryDto } from "./event-dto";
import { EVENT_COVER_PLACEHOLDER_ART } from "./event-record";

type Groupable = Pick<EventSummaryDto, "startsAt" | "status">;

export function groupEvents<T extends Groupable>(events: T[]) {
  const ascending = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    live: ascending.filter((event) => event.status === "live"),
    upcoming: ascending.filter((event) => event.status === "upcoming"),
    completed: ascending.filter((event) => event.status === "completed").reverse(),
    all: [...ascending].reverse(),
  };
}

export function eventArt(event: { coverImage: string | null }): CityArt {
  return event.coverImage ? { ...EVENT_COVER_PLACEHOLDER_ART, image: event.coverImage } : EVENT_COVER_PLACEHOLDER_ART;
}

export function formatCountdown(startsAt: string, now = new Date()) {
  const days = Math.floor((new Date(startsAt).getTime() - now.getTime()) / 86_400_000);
  if (days < 1) return "Starts today";
  return `In ${days} ${days === 1 ? "day" : "days"}`;
}
