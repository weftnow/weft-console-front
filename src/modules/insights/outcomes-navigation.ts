import { uuidSchema } from "@/modules/events/event-schemas";

export type ParsedOutcomesEventId =
  | { kind: "all" }
  | { kind: "event"; eventId: string }
  | { kind: "invalid" };

export function parseOutcomesEventId(value: string | string[] | undefined): ParsedOutcomesEventId {
  if (value === undefined) return { kind: "all" };
  if (Array.isArray(value)) return { kind: "invalid" };
  const trimmed = value.trim();
  if (trimmed === "") return { kind: "all" };
  const parsed = uuidSchema.safeParse(trimmed);
  return parsed.success ? { kind: "event", eventId: parsed.data.toLowerCase() } : { kind: "invalid" };
}

export function outcomesHref(eventId?: string | null): string {
  return eventId ? `/outcomes?eventId=${encodeURIComponent(eventId)}` : "/outcomes";
}
