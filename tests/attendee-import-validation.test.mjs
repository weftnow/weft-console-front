import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const csv = "First Name,Last Name,Email,Guest Type,Notes\nAda,Lovelace,ada@example.com,VIP,ignored\n";

test("CSV import preparation accepts BOM, aliases, quotes and logical newlines", () => {
  const { prepareCsvImport } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const prepared = prepareCsvImport({
    fileName: "  guests.csv  ",
    csvText: '\uFEFFGiven Name,Surname,Email Address,Company\nAda,Lovelace,ada@example.com,"North,\nSouth"\n\n',
  });

  assert.equal(prepared.fileName, "guests.csv");
  assert.equal(prepared.guests[0].company, "North,\nSouth");
  assert.equal(prepared.guests[0].email, "ada@example.com");
  assert.equal(prepared.blankCount, 1);
  assert.match(prepared.contentHash, /^[a-f0-9]{64}$/);
});

test("CSV import preparation rejects duplicate and ambiguous headers", () => {
  const { prepareCsvImport } = loadTs("src/modules/events/server/attendee-import-service.ts");
  assert.throws(() => prepareCsvImport({ fileName: "guests.csv", csvText: "First Name,First Name\nAda,Lovelace\n" }), (error) => /header/i.test(Object.values(error.fields ?? {}).join(" ")));
  assert.throws(() => prepareCsvImport({ fileName: "guests.csv", csvText: "First Name,Given Name\nAda,Lovelace\n" }), (error) => /header/i.test(Object.values(error.fields ?? {}).join(" ")));
});

test("CSV import preparation reports logical row errors and ignores unknown columns", () => {
  const { prepareCsvImport } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const prepared = prepareCsvImport({ fileName: "guests.csv", csvText: csv });
  assert.equal(prepared.guests[0].firstName, "Ada");
  assert.equal(Object.hasOwn(prepared.guests[0], "notes"), false);
  assert.throws(() => prepareCsvImport({
    fileName: "guests.csv",
    csvText: 'First Name,Last Name,Company\nAda,Lovelace,"North\nSouth"\n,,North\n',
  }), (error) => error.fields?.["rows.3.firstName"] === "Add a name.");
});

test("CSV import preparation rejects invalid values, duplicate emails, and empty files", () => {
  const { prepareCsvImport } = loadTs("src/modules/events/server/attendee-import-service.ts");
  for (const csvText of [
    "First Name,Email\nAda,not-an-email\n",
    "First Name,LinkedIn\nAda,https://example.com/in/ada\n",
    "First Name,Guest Type\nAda,Alien\n",
    "First Name,Email\nAda,ada@example.com\nAugusta,ADA@example.com\n",
    "First Name,Last Name\n",
  ]) assert.throws(() => prepareCsvImport({ fileName: "guests.csv", csvText }));
});

test("CSV import preparation enforces file, candidate and filename limits", () => {
  const { prepareCsvImport } = loadTs("src/modules/events/server/attendee-import-service.ts");
  assert.throws(() => prepareCsvImport({ fileName: "guests.csv", csvText: `First Name\n${"a".repeat(1024 * 1024)}` }), (error) => /1 MiB/i.test(Object.values(error.fields ?? {}).join(" ")));
  assert.throws(() => prepareCsvImport({ fileName: "../guests.csv", csvText: csv }), (error) => /file name/i.test(Object.values(error.fields ?? {}).join(" ")));
  const many = `First Name\n${Array.from({ length: 2001 }, (_, index) => `Guest${index}`).join("\n")}`;
  assert.throws(() => prepareCsvImport({ fileName: "guests.csv", csvText: many }), (error) => /2,000/i.test(Object.values(error.fields ?? {}).join(" ")));
});

test("append decision skips event-local emails without changing existing guests and replays before capacity", () => {
  const { prepareCsvImport, decideAttendeeAppend } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const prepared = prepareCsvImport({ fileName: "guests.csv", csvText: "First Name,Email\nAda,ada@example.com\nGrace,grace@example.com\n" });
  const snapshot = {
    event: { id: "event-1", organizationId: "org-1" },
    membership: { active: true, role: "organizer" },
    existingCount: 1,
    maxPosition: 12,
    existingEmails: new Set(["ada@example.com"]),
    matchingImport: null,
  };
  const decision = decideAttendeeAppend(snapshot, prepared);
  assert.equal(decision.kind, "append");
  assert.equal(decision.guests.length, 1);
  assert.equal(decision.guests[0].firstName, "Grace");
  assert.equal(decision.counts.duplicateCount, 1);
  assert.equal(decision.firstPosition, 13);

  const replay = decideAttendeeAppend({ ...snapshot, existingCount: 2000, matchingImport: { id: "batch-1" } }, prepared);
  assert.deepEqual(replay, { kind: "replay", import: { id: "batch-1" } });
});

test("append decisions allow no-email guests and reject revoked or non-organizer memberships", () => {
  const { prepareCsvImport, decideAttendeeAppend } = loadTs("src/modules/events/server/attendee-import-service.ts");
  const prepared = prepareCsvImport({ fileName: "guests.csv", csvText: "First Name,Email\nAda,\nAugusta,\n" });
  const base = {
    event: { id: "event-1", organizationId: "org-1" },
    membership: { active: true, role: "owner" }, existingCount: 0, maxPosition: -1,
    existingEmails: new Set(), matchingImport: null,
  };
  const result = decideAttendeeAppend(base, prepared);
  assert.equal(result.kind, "append");
  assert.equal(result.guests.length, 2);
  assert.throws(() => decideAttendeeAppend({ ...base, membership: { active: false, role: "owner" } }, prepared), /access/i);
  assert.throws(() => decideAttendeeAppend({ ...base, membership: { active: true, role: "staff" } }, prepared), /access/i);
});

test("import request and DTO schemas reject client supplied provenance", () => {
  const { attendeeImportInputSchema, attendeeImportDtoSchema } = loadTs("src/modules/events/attendee-import-schemas.ts");
  assert.equal(attendeeImportInputSchema.safeParse({ fileName: "guests.csv", csvText: csv }).success, true);
  assert.equal(attendeeImportInputSchema.safeParse({ fileName: "guests.csv", csvText: csv, userId: "spoof" }).success, false);
  assert.equal(attendeeImportDtoSchema.safeParse({
    id: "11111111-1111-4111-8111-111111111111", eventId: "22222222-2222-4222-8222-222222222222",
    fileName: "guests.csv", importedCount: 1, storedCount: 1, duplicateCount: 0,
    blankCount: 0, vipCount: 0, sponsorCount: 0, importedAt: "2026-10-02T00:00:00.000Z",
  }).success, true);
});
