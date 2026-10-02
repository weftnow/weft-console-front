import { z } from "zod";
import { uuidSchema } from "./event-schemas";

export const importFileNameSchema = z.string().trim().min(1).max(255)
  .refine((value) => !/[\\/\u0000-\u001f\u007f]/.test(value), "Use a file name without paths or control characters.");

export const attendeeImportInputSchema = z.strictObject({
  fileName: importFileNameSchema,
  csvText: z.string().min(1).refine((value) => new TextEncoder().encode(value).byteLength <= 1024 * 1024, "CSV must be 1 MiB or smaller."),
});

export const attendeeImportDtoSchema = z.strictObject({
  id: uuidSchema,
  eventId: uuidSchema,
  fileName: importFileNameSchema,
  importedCount: z.number().int().min(0).max(2000),
  storedCount: z.number().int().min(0).max(2000),
  duplicateCount: z.number().int().min(0).max(2000),
  blankCount: z.number().int().min(0),
  vipCount: z.number().int().min(0),
  sponsorCount: z.number().int().min(0),
  importedAt: z.iso.datetime(),
}).refine((batch) => batch.importedCount === batch.storedCount + batch.duplicateCount, "Import counts are inconsistent.");

export const importAttendeesResultSchema = z.strictObject({
  data: z.strictObject({ import: attendeeImportDtoSchema, replayed: z.boolean() }),
});

export type AttendeeImportInput = z.output<typeof attendeeImportInputSchema>;
export type AttendeeImportDto = z.infer<typeof attendeeImportDtoSchema>;
export type ImportAttendeesResult = z.infer<typeof importAttendeesResultSchema>["data"];
