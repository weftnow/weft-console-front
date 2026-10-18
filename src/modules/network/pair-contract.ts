import { z } from "zod";

const uuid = z.uuid();

export function canonicalizePair(guestAId: string, guestBId: string): { guestLowId: string; guestHighId: string } {
  const parsedA = uuid.safeParse(guestAId);
  const parsedB = uuid.safeParse(guestBId);
  if (!parsedA.success || !parsedB.success) throw new Error("Pair members must be guest UUIDs.");
  const a = parsedA.data.toLowerCase();
  const b = parsedB.data.toLowerCase();
  if (a === b) throw new Error("A guest cannot be paired with itself.");
  return a < b ? { guestLowId: a, guestHighId: b } : { guestLowId: b, guestHighId: a };
}
