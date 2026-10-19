import { z } from "zod";
import { uuidSchema } from "./event-schemas";

export const eventAccessModeSchema = z.enum(["operator", "wefter"]);
export const eventAccessUpdateSchema = z.strictObject({
  accessMode: eventAccessModeSchema.nullable(),
  expectedRevision: z.number().int().min(0).max(2_147_483_646),
});
export const eventAccessDtoSchema = z.strictObject({
  eventId: uuidSchema,
  organizationId: uuidSchema,
  membershipId: uuidSchema,
  accessMode: eventAccessModeSchema.nullable(),
  revision: z.number().int().min(0),
  memberName: z.string(),
  role: z.literal("staff"),
});
export const eventAccessListSchema = z.strictObject({
  data: z.strictObject({ eventAccess: z.array(eventAccessDtoSchema) }),
});
export const eventAccessUpdateResponseSchema = z.strictObject({
  data: z.strictObject({ eventAccess: eventAccessDtoSchema }),
});
export const wefterEventContextSchema = z.strictObject({
  eventId: uuidSchema,
  name: z.string(),
  venue: z.string(),
  accessMode: z.literal("wefter"),
});

export type EventAccessMode = z.infer<typeof eventAccessModeSchema>;
export type EventAccessDto = z.infer<typeof eventAccessDtoSchema>;
