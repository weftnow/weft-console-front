import type { EventGuestRecord } from "./event-record";
import { csvGuestSchema } from "./event-schemas";
import { EVENT_AUDIENCE_OPTIONS } from "./event-options";

export interface GuestCsvResult {
  guests: EventGuestRecord[];
  guestRows: number[];
  rows: number;
  skipped: number;
  sponsors: number;
  truncated: false;
  vips: number;
}

export class GuestCsvError extends Error {}

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

type Parser = (text: string, options: { columns: true; bom: true; skip_empty_lines: true; trim: true }) => Record<string, string>[];

export function parseGuestCsvRows(text: string, parser: Parser): GuestCsvResult {
  if (new TextEncoder().encode(text).byteLength > 1024 * 1024) throw new GuestCsvError("CSV must be 1 MiB or smaller.");
  let records: Record<string, string>[];
  try { records = parser(text, { columns: true, bom: true, skip_empty_lines: true, trim: true }); }
  catch { throw new GuestCsvError("CSV contains malformed rows."); }
  if (records.length === 0) throw new GuestCsvError("No attendee rows found.");
  const headers = Object.keys(records[0]).map(normalizeHeader);
  if (!["firstName", "lastName"].some((field) => aliases[field as Field].some((alias) => headers.includes(alias)))) throw new GuestCsvError("A first or last name column is required.");
  const guests: EventGuestRecord[] = [];
  const guestRows: number[] = [];
  let skipped = 0;
  for (const [index, row] of records.entries()) {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? "").trim()]));
    const read = (field: Field) => aliases[field].map((alias) => normalized[alias]).find((value) => value !== undefined) ?? "";
    if (Object.values(normalized).every((value) => !value)) { skipped += 1; continue; }
    const rawType = read("guestType");
    const type = rawType ? ["Attendee", "VIP", "Sponsor"].find((candidate) => candidate.toLowerCase() === rawType.toLowerCase()) : "Attendee";
    if (!type) throw new GuestCsvError(`Row ${index + 2}: unknown guest type.`);
    const rawProfile = read("profileType");
    const profileType = EVENT_AUDIENCE_OPTIONS.find((option) => normalizeHeader(option) === normalizeHeader(rawProfile)) ?? rawProfile;
    let linkedin: string;
    try { linkedin = normalizeLinkedin(read("linkedin")); }
    catch (error) {
      if (error instanceof GuestCsvError) throw new GuestCsvError(`Row ${index + 2}: ${error.message}`);
      throw error;
    }
    const candidate = {
      company: read("company"), email: read("email").toLowerCase(), firstName: read("firstName"),
      guestType: type, lastName: read("lastName"), linkedin,
      phone: read("phone"), position: read("position"), profileType,
    };
    const parsed = csvGuestSchema.safeParse(candidate);
    if (!parsed.success) throw new GuestCsvError(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid guest"}`);
    if (guests.length >= 2000) throw new GuestCsvError("The initial guest list is limited to 2,000 people.");
    guests.push({ ...parsed.data, source: "csv" });
    guestRows.push(index + 2);
  }
  if (!guests.length) throw new GuestCsvError("No attendee rows found.");
  return { guests, guestRows, rows: guests.length, skipped, sponsors: guests.filter((guest) => guest.guestType === "Sponsor").length, vips: guests.filter((guest) => guest.guestType === "VIP").length, truncated: false };
}
