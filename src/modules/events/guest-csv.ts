import { parse } from "csv-parse/browser/esm/sync";
import { parseGuestCsvRows, type GuestCsvResult } from "./guest-csv-core";

export { GuestCsvError, type GuestCsvResult } from "./guest-csv-core";

export function getGuestCsvFieldError(fields: Record<string, string>): string | null {
  return Object.entries(fields).find(([field]) => field === "attendeeImport.csvText" || field === "attendeeImport.fileName" || field.startsWith("attendeeImport.rows."))?.[1] ?? null;
}

/** Browser preview; the server independently parses the original CSV text. */
export function parseGuestCsv(text: string): GuestCsvResult {
  return parseGuestCsvRows(text, parse);
}
