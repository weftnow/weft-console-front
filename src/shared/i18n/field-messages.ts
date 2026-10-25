import type { Dictionary } from "./dictionaries/types";
import type { I18n } from "./i18n";

type FieldKey = keyof Dictionary["errors"]["fields"];

// English message text is the stable id emitted by schemas and services; see tests/i18n.test.mjs for the parity check.
const FIXED: Record<string, FieldKey> = {
  "Use a file name without paths or control characters.": "fileNamePlain",
  "CSV must be 1 MiB or smaller.": "csvTooLarge",
  "Add at least one name.": "addAtLeastOneName",
  "Enter a valid calendar date.": "validDate",
  "Add a first name.": "addFirstName",
  "Add an email address.": "addEmail",
  "Add a name.": "addName",
  "Choose each category once.": "eachCategoryOnce",
  "Choose each audience once.": "eachAudienceOnce",
  "Choose each staff member once.": "eachStaffOnce",
  "End date must be on or after start date.": "endAfterStartDate",
  "This local time is ambiguous or does not exist in the selected city.": "ambiguousLocalTime",
  "End time must be after the start time.": "endAfterStartTime",
  "Choose two different guests.": "twoDifferentGuests",
  "Both guests must be on this event.": "bothOnEvent",
  "LinkedIn must be a LinkedIn profile URL.": "linkedinUrl",
  "Enter a valid LinkedIn profile URL.": "linkedinUrlEnter",
  "CSV contains malformed rows.": "csvMalformed",
  "No attendee rows found.": "noRows",
  "CSV headers must be unique.": "headersUnique",
  "CSV headers are ambiguous.": "headersAmbiguous",
  "A first or last name column is required.": "nameColumnRequired",
  "This row does not match the CSV headers.": "rowMismatch",
  "Choose Attendee, VIP, or Sponsor.": "chooseGuestType",
  "The attendee CSV is limited to 2,000 records.": "csvLimit",
  "The combined initial guest list is limited to 2,000 people.": "combinedLimit",
  "Each initial guest email must be unique.": "emailUnique",
  "Selected staff must be active members of this organization.": "staffActive",
  "Organization selection changed.": "orgChanged",
  "Choose English or Spanish.": "languageChoice",
  "Choose a valid JPG, PNG or WebP image.": "coverImage",
  "Choose the CSV file again.": "chooseCsvAgain",
  "Times must be within the event and windows cannot overlap.": "windowsWithin",
  "Intervals must be ordered, non-overlapping, and within the event dates.": "intervalsOrdered",
  "Choose a valid access mode and revision.": "accessModeRevision",
};

/** Translate a validation message emitted by a schema or service. Unknown text is returned unchanged. */
export function localizeFieldMessage(i18n: Pick<I18n, "dict" | "t">, text: string): string {
  const { dict, t } = i18n;
  const fields = dict.errors.fields;
  const fixed = FIXED[text];
  if (fixed) return fields[fixed];
  const rowEmail = /^Row (\d+): each initial guest email must be unique\.$/.exec(text);
  if (rowEmail) return t(fields.rowEmailUnique, { row: rowEmail[1] });
  const repeats = /^Email also appears on record (\d+)\.$/.exec(text);
  if (repeats) return t(fields.emailRepeats, { row: repeats[1] });
  const omitted = /^(\d+) additional row errors were omitted\.$/.exec(text);
  if (omitted) return t(fields.omitted, { count: omitted[1] });
  const row = /^Row (\d+): (.*?)(?: \((\d+) row errors\))?$/.exec(text);
  if (row) {
    const suffix = row[3] ? t(fields.rowErrors, { count: row[3] }) : "";
    return t(fields.row, { row: row[1], message: localizeFieldMessage(i18n, row[2]) }) + suffix;
  }
  return text;
}

/** Message for an ApplicationError code, in the active language. */
export function localizeErrorCode(dict: Dictionary, code: string): string {
  return (dict.errors as Record<string, unknown>)[code] as string | undefined ?? dict.errors.INTERNAL_ERROR;
}
export const FIELD_MESSAGE_IDS = Object.keys(FIXED);
export const FIELD_MESSAGE_KEYS = FIXED;
