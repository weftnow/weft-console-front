import type { EventGuestRecord } from "./event-record";
import type { AttendeeImportDto } from "./attendee-import-schemas";

export type AttendeeImportInput = { fileName: string; csvText: string };

export type PreparedCsvImport = {
  blankCount: number;
  contentHash: string;
  fileName: string;
  guests: EventGuestRecord[];
  guestRows: number[];
  importedCount: number;
  sponsorCount: number;
  vipCount: number;
};

export type EventRosterSnapshot = {
  membership: { active: boolean; role: string } | null;
  event: { id: string; organizationId: string } | null;
  existingCount: number;
  maxPosition: number;
  existingEmails: Set<string>;
  matchingImport: AttendeeImportDto | null;
};

export type AttendeeAppendCounts = {
  importedCount: number;
  storedCount: number;
  duplicateCount: number;
  blankCount: number;
  vipCount: number;
  sponsorCount: number;
};

export type ImportDecision =
  | { kind: "replay"; import: AttendeeImportDto }
  | { kind: "append"; guests: EventGuestRecord[]; firstPosition: number; counts: AttendeeAppendCounts };

export type ImportAttendeesResult = { import: AttendeeImportDto; replayed: boolean };

export type LockedEventRosterResult = ImportAttendeesResult;
