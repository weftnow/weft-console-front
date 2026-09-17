import {
  EVENT_AUDIENCE_OPTIONS,
  MAX_STORED_GUESTS,
  type EventGuestRecord,
  type EventGuestType,
} from "./event-record";

export interface GuestCsvResult {
  guests: EventGuestRecord[];
  /** Rows that named a person, whether or not they were stored. */
  rows: number;
  /** Rows skipped for having neither a name nor an email. */
  skipped: number;
  sponsors: number;
  /** True when `rows` exceeded MAX_STORED_GUESTS and `guests` was clipped. */
  truncated: boolean;
  vips: number;
}

export class GuestCsvError extends Error {}

/** The guest fields a CSV column can populate. */
type GuestCsvField =
  | "company"
  | "email"
  | "firstName"
  | "guestType"
  | "lastName"
  | "linkedin"
  | "phone"
  | "position"
  | "profileType";

/** Header spellings accepted for each field, already normalized. */
const COLUMN_ALIASES: Record<GuestCsvField, string[]> = {
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

export function splitCsvRow(row: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index];
    if (character === '"' && row[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[\s_-]+/g, "");
}

function toGuestType(value: string): EventGuestType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "vip") return "VIP";
  if (normalized === "sponsor") return "Sponsor";
  return "Attendee";
}

/** Match a free-text profile type back to the app's audience vocabulary. */
function toProfileType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = normalizeHeader(trimmed);
  const known = EVENT_AUDIENCE_OPTIONS.find(
    (option) => normalizeHeader(option) === normalized,
  );
  return known ?? trimmed;
}

/**
 * Turn raw CSV text into guest records.
 *
 * `rows`, `vips`, and `sponsors` describe the whole file; `guests` holds at
 * most MAX_STORED_GUESTS of them, so a very large import still reports honest
 * totals on the event.
 */
export function parseGuestCsv(text: string): GuestCsvResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new GuestCsvError("No attendee rows found");
  }

  const headers = splitCsvRow(lines[0]).map(normalizeHeader);
  const indexes = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([field, aliases]) => [
      field,
      headers.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<GuestCsvField, number>;

  if (indexes.firstName < 0 && indexes.lastName < 0 && indexes.email < 0) {
    throw new GuestCsvError("No name or email column found");
  }

  const guests: EventGuestRecord[] = [];
  let rows = 0;
  let skipped = 0;
  let vips = 0;
  let sponsors = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvRow(line);
    const read = (field: GuestCsvField) =>
      indexes[field] >= 0 ? (cells[indexes[field]] ?? "") : "";

    const firstName = read("firstName");
    const lastName = read("lastName");
    const email = read("email");
    if (!firstName && !lastName && !email) {
      skipped += 1;
      continue;
    }

    const guestType = toGuestType(read("guestType"));
    rows += 1;
    if (guestType === "VIP") vips += 1;
    if (guestType === "Sponsor") sponsors += 1;

    if (guests.length < MAX_STORED_GUESTS) {
      guests.push({
        company: read("company"),
        email,
        firstName,
        guestType,
        lastName,
        linkedin: read("linkedin"),
        phone: read("phone"),
        position: read("position"),
        profileType: toProfileType(read("profileType")),
        source: "csv",
      });
    }
  }

  if (rows === 0) {
    throw new GuestCsvError("No attendee rows found");
  }

  return { guests, rows, skipped, sponsors, truncated: rows > guests.length, vips };
}
