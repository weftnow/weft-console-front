import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";
import { eventAccessUpdateSchema, type EventAccessDto } from "../access-schemas";
import * as repository from "./access-repository";

type Dependencies = Pick<typeof repository, "listEventAccess" | "saveEventAccess">;

export async function getEventAccess(input: { eventId: string; userId: string }, deps: Dependencies = repository) {
  const rows = await deps.listEventAccess(input.eventId, input.userId);
  if (!rows) throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  return rows;
}

export async function updateEventAccess(input: { eventId: string; userId: string; membershipId: string; data: unknown }, deps: Dependencies = repository): Promise<EventAccessDto> {
  const parsed = eventAccessUpdateSchema.safeParse(input.data);
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR", "Check the access change.", { accessMode: "Choose a valid access mode and revision." });
  const result = await deps.saveEventAccess({ ...input, ...parsed.data });
  if (result.kind === "missing") throw new ApplicationError("NOT_FOUND", "Event not found.");
  if (result.kind === "denied") throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
  if (result.kind === "invalid-target") throw new ApplicationError("VALIDATION_ERROR", "Only active staff memberships can receive event access.");
  if (result.kind === "conflict") {
    const currentRows = await deps.listEventAccess(input.eventId, input.userId);
    const current = currentRows?.find((row) => row.membershipId === input.membershipId) ?? null;
    throw new ApplicationError("CONFLICT", "This event access changed. Review the latest saved value before trying again.", undefined, {
      kind: "STALE_VERSION", current,
    });
  }
  const currentRows = await deps.listEventAccess(input.eventId, input.userId);
  const saved = currentRows?.find((row) => row.membershipId === input.membershipId);
  if (saved) return saved;
  // The actor may have been revoked immediately after the transaction. Do not
  // return a protected snapshot after that change.
  throw new ApplicationError("FORBIDDEN", "You do not have access to manage this event.");
}
