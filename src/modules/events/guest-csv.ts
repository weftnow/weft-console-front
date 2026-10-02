import { parse } from "csv-parse/browser/esm/sync";
import { parseGuestCsvRows, type GuestCsvResult } from "./guest-csv-core";

export { GuestCsvError, type GuestCsvResult } from "./guest-csv-core";

/** Browser preview; the server independently parses the original CSV text. */
export function parseGuestCsv(text: string): GuestCsvResult {
  return parseGuestCsvRows(text, parse);
}
