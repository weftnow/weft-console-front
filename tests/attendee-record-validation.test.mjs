import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { attendeeReplacementSchema, attendeeLinkSchema } = loadTs("src/modules/events/attendee-record-schemas.ts");
const { normalizeAttendeeEmail, normalizeAttendeePhone, attendeeContactFlags } = loadTs("src/modules/events/attendee-contact.ts");
const id = "11111111-1111-4111-8111-111111111111";
const base = {
  expectedRevision: 1, firstName: "Ada", lastName: "Lovelace", email: " ADA@example.com ",
  phone: "+1 (415) 555-0100", company: "Analytical Engines", position: "Director",
  profileType: "Investor", guestType: "VIP", linkedin: "",
};

test("attendee replacements validate all supported details and reject extra fields or invalid revisions", () => {
  const parsed = attendeeReplacementSchema.parse(base);
  assert.equal(parsed.email, "ADA@example.com");
  assert.equal(attendeeReplacementSchema.safeParse({ ...base, expectedRevision: 0 }).success, false);
  assert.equal(attendeeReplacementSchema.safeParse({ ...base, source: "manual" }).success, false);
  assert.equal(attendeeReplacementSchema.safeParse({ ...base, firstName: "", lastName: "" }).success, false);
  assert.equal(attendeeReplacementSchema.safeParse({ ...base, guestType: "Attendee" }).success, true);
});

test("email and phone normalization use exact syntax and never infer a country code", () => {
  assert.equal(normalizeAttendeeEmail(" ADA@Example.COM "), "ada@example.com");
  assert.equal(normalizeAttendeeEmail("not-an-email"), null);
  assert.equal(normalizeAttendeeEmail("ada@.example.com"), null);
  assert.equal(normalizeAttendeePhone("+1 (415) 555-0100"), "+14155550100");
  assert.equal(normalizeAttendeePhone("415-555-0100"), "4155550100");
  assert.equal(normalizeAttendeePhone("555010"), null);
  assert.equal(normalizeAttendeePhone("++1 415 555 0100"), null);
  assert.deepEqual(attendeeContactFlags("", "555010"), { email: "missing", phone: "invalid" });
});

test("identity link requests require two UUID guest IDs and reject unknown fields", () => {
  assert.equal(attendeeLinkSchema.safeParse({ duplicateGuestId: id, canonicalGuestId: id }).success, true);
  assert.equal(attendeeLinkSchema.safeParse({ duplicateGuestId: "bad", canonicalGuestId: id }).success, false);
  assert.equal(attendeeLinkSchema.safeParse({ duplicateGuestId: id, canonicalGuestId: id, expectedRevision: 1 }).success, false);
});
