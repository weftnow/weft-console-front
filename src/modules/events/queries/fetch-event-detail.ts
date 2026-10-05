import { eventDetailResponseSchema, type EventDetailDto } from "../event-dto";
import { ApplicationError } from "@/shared/lib/application-error";

export type EventDetailQueryResult =
  | { kind: "ready"; event: EventDetailDto }
  | { kind: "unauthorized" | "forbidden" | "not-found" };

export function isEventReadCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function fetchEventDetail(
  eventId: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<EventDetailQueryResult> {
  try {
    const response = await fetcher(`/api/events/${encodeURIComponent(eventId)}`, {
      credentials: "same-origin", cache: "no-store", signal,
    });
    if (response.status === 401) return { kind: "unauthorized" };
    if (response.status === 403) return { kind: "forbidden" };
    if (response.status === 404) return { kind: "not-found" };
    if (!response.ok) throw new ApplicationError("INTERNAL_ERROR", "Could not load the event. Please try again.");
    const parsed = eventDetailResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.data.event.id !== eventId) {
      throw new ApplicationError("INTERNAL_ERROR", "The server returned an invalid event. Please try again.");
    }
    return { kind: "ready", event: parsed.data.data.event };
  } catch (error) {
    if (signal.aborted || isEventReadCancellation(error)) throw error;
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("INTERNAL_ERROR", "Could not reach the server. Please try again.");
  }
}
