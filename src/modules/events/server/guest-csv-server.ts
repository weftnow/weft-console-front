import "server-only";
import { parse } from "csv-parse/sync";
import { parseGuestCsvRows, type GuestCsvResult } from "../guest-csv-core";

export function parseGuestCsvServer(text: string): GuestCsvResult {
  return parseGuestCsvRows(text, parse);
}
