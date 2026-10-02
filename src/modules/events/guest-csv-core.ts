import type { EventGuestRecord } from "./event-record";
import { csvGuestSchema } from "./event-schemas";
import { EVENT_AUDIENCE_OPTIONS } from "./event-options";

export interface GuestCsvResult {
  guests: EventGuestRecord[];
  guestRows: number[];
  rows: number;
  skipped: number;
  blankCount: number;
  sponsors: number;
  truncated: false;
  vips: number;
}

export class GuestCsvError extends Error {
  fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message);
    this.fields = fields;
  }
}

type Field = "company" | "email" | "firstName" | "guestType" | "lastName" | "linkedin" | "phone" | "position" | "profileType";
const aliases: Record<Field, string[]> = {
  company: ["company", "organization", "organisation", "employer", "brand"],
  email: ["email", "emailaddress", "mail", "workemail"],
  firstName: ["firstname", "first", "givenname", "forename"],
  guestType: ["guesttype", "guest", "tickettype", "attendeetype", "type"],
  lastName: ["lastname", "last", "surname", "familyname"],
  linkedin: ["linkedin", "linkedinurl", "linkedinprofile", "profileurl"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber", "cell", "telephone", "tel", "number"],
  position: ["position", "role", "title", "jobtitle", "jobrole"],
  profileType: ["profiletype", "profile", "audience", "audiencetype", "segment"],
};
const fields = Object.keys(aliases) as Field[];
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "");

export function normalizeLinkedin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^linkedin\.com\//i.test(trimmed) || /^www\.linkedin\.com\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !["linkedin.com", "www.linkedin.com"].includes(url.hostname.toLowerCase()) || !url.pathname.startsWith("/in/") || url.username || url.password || candidate.length > 500) throw new Error("invalid");
    return url.toString();
  } catch {
    throw new GuestCsvError("LinkedIn must be a LinkedIn profile URL.");
  }
}

type Parser = (text: string, options: { columns: false; bom: true; skip_empty_lines: false; trim: true; relax_column_count: true }) => string[][];

function rowErrors(issues: { path: PropertyKey[]; message: string }[], record: number) {
  return issues.map((issue) => ({
    path: `rows.${record}.${String(issue.path[0] ?? "firstName")}`,
    message: issue.message,
  }));
}

export function parseGuestCsvRows(text: string, parser: Parser): GuestCsvResult {
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024) throw new GuestCsvError("CSV must be 1 MiB or smaller.", { csvText: "CSV must be 1 MiB or smaller." });
  let records: string[][];
  try { records = parser(text, { columns: false, bom: true, skip_empty_lines: false, trim: true, relax_column_count: true }); }
  catch { throw new GuestCsvError("CSV contains malformed rows.", { csvText: "CSV contains malformed rows." }); }
  if (records.length === 0 || records[0].every((header) => !header.trim())) throw new GuestCsvError("No attendee rows found.", { csvText: "No attendee rows found." });

  const headers = records[0].map((header) => normalizeHeader(String(header ?? "")));
  const seen = new Set<string>();
  const mapped = new Map<Field, number>();
  for (const [index, header] of headers.entries()) {
    if (!header) continue;
    if (seen.has(header)) throw new GuestCsvError("CSV headers must be unique.", { csvText: "CSV headers must be unique." });
    seen.add(header);
    const field = fields.find((candidate) => aliases[candidate].includes(header));
    if (field) {
      if (mapped.has(field)) throw new GuestCsvError("CSV headers cannot map to the same guest field more than once.", { csvText: "CSV headers are ambiguous." });
      mapped.set(field, index);
    }
  }
  if (!mapped.has("firstName") && !mapped.has("lastName")) throw new GuestCsvError("A first or last name column is required.", { csvText: "A first or last name column is required." });

  const guests: EventGuestRecord[] = [];
  const guestRows: number[] = [];
  const errors: { path: string; message: string }[] = [];
  const emailRows = new Map<string, number>();
  let blankCount = 0;
  for (const [index, record] of records.slice(1).entries()) {
    const logicalRecord = index + 2;
    const row = record.map((value) => String(value ?? "").trim());
    if (row.every((value) => !value)) { blankCount += 1; continue; }
    if (record.length !== headers.length) {
      errors.push({ path: `rows.${logicalRecord}.row`, message: "This row does not match the CSV headers." });
      continue;
    }
    const read = (field: Field) => {
      const column = mapped.get(field);
      return column === undefined ? "" : row[column] ?? "";
    };
    const rawType = read("guestType");
    const guestType = rawType ? ["Attendee", "VIP", "Sponsor"].find((candidate) => candidate.toLowerCase() === rawType.toLowerCase()) : "Attendee";
    const rawProfile = read("profileType");
    const profileType = EVENT_AUDIENCE_OPTIONS.find((option) => normalizeHeader(option) === normalizeHeader(rawProfile)) ?? rawProfile;
    let linkedin = "";
    try { linkedin = normalizeLinkedin(read("linkedin")); }
    catch { errors.push({ path: `rows.${logicalRecord}.linkedin`, message: "LinkedIn must be a LinkedIn profile URL." }); }
    const candidate = {
      company: read("company"), email: read("email").trim().toLowerCase(), firstName: read("firstName"),
      guestType, lastName: read("lastName"), linkedin,
      phone: read("phone"), position: read("position"), profileType,
    };
    const parsed = csvGuestSchema.safeParse(candidate);
    if (!guestType) errors.push({ path: `rows.${logicalRecord}.guestType`, message: "Choose Attendee, VIP, or Sponsor." });
    if (!parsed.success) errors.push(...rowErrors(parsed.error.issues, logicalRecord));
    if (!parsed.success || !guestType) continue;
    if (candidate.email && emailRows.has(candidate.email)) {
      errors.push({ path: `rows.${logicalRecord}.email`, message: `Email also appears on record ${emailRows.get(candidate.email)}.` });
    } else if (candidate.email) emailRows.set(candidate.email, logicalRecord);
    guests.push({ ...parsed.data, linkedin, email: candidate.email, source: "csv" });
    guestRows.push(logicalRecord);
  }
  if (guests.length > 2000) throw new GuestCsvError("The attendee CSV is limited to 2,000 records.", { csvText: "The attendee CSV is limited to 2,000 records." });
  if (errors.length) {
    const fields = Object.fromEntries(errors.slice(0, 20).map(({ path, message }) => [path, message]));
    if (errors.length > 20) fields.csvText = `${errors.length - 20} additional row errors were omitted.`;
    const first = errors[0];
    throw new GuestCsvError(`Row ${first.path.match(/^rows\.(\d+)/)?.[1] ?? "?"}: ${first.message}${errors.length > 1 ? ` (${errors.length} row errors)` : ""}`, fields);
  }
  if (!guests.length) throw new GuestCsvError("No attendee rows found.", { csvText: "No attendee rows found." });
  return { guests, guestRows, rows: guests.length, skipped: blankCount, blankCount, sponsors: guests.filter((guest) => guest.guestType === "Sponsor").length, vips: guests.filter((guest) => guest.guestType === "VIP").length, truncated: false };
}
