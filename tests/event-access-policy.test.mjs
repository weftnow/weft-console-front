import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { canAccessEvent } = loadTs("src/modules/events/access-policy.ts");

test("owners and organizers retain organization event reads regardless of event grant mode", () => {
  for (const role of ["owner", "organizer"]) {
    for (const mode of [null, "operator", "wefter"]) assert.equal(canAccessEvent({ membership: { active: true, role }, accessMode: mode }, "detail"), true);
  }
});

test("operator grants allow reads only and do not authorize imports or grant administration", () => {
  for (const operation of ["list", "detail", "cover", "roster"]) assert.equal(canAccessEvent({ membership: { active: true, role: "staff" }, accessMode: "operator" }, operation), true);
  for (const operation of ["import", "manage-access", "team"]) assert.equal(canAccessEvent({ membership: { active: true, role: "staff" }, accessMode: "operator" }, operation), false);
});

test("Wefter grants have no roster or write access; inactive and sponsor memberships stay denied", () => {
  for (const operation of ["list", "detail", "cover", "roster", "import", "manage-access", "team"]) {
    const allowed = operation === "list";
    assert.equal(canAccessEvent({ membership: { active: true, role: "staff" }, accessMode: "wefter" }, operation), allowed);
  }
  assert.equal(canAccessEvent({ membership: { active: false, role: "staff" }, accessMode: "operator" }, "roster"), false);
  assert.equal(canAccessEvent({ membership: { active: true, role: "sponsor" }, accessMode: "operator" }, "roster"), false);
  assert.equal(canAccessEvent({ membership: { active: true, role: "staff" }, accessMode: null }, "detail"), false);
});

test("Wefter context is a strict allowlist and rejects roster or private fields", () => {
  const { wefterEventContextSchema } = loadTs("src/modules/events/access-schemas.ts");
  const context = { eventId: "11111111-1111-4111-8111-111111111111", name: "Forum", venue: "Hall A", accessMode: "wefter" };
  assert.deepEqual(wefterEventContextSchema.parse(context), context);
  assert.equal(wefterEventContextSchema.safeParse({ ...context, guests: [{ email: "private@example.com" }] }).success, false);
  assert.equal(wefterEventContextSchema.safeParse({ ...context, importHistory: [] }).success, false);
});

test("canonical event pairs lowercase UUID text, order either direction identically, and reject self-pairs", () => {
  const { canonicalizePair } = loadTs("src/modules/network/pair-contract.ts");
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(canonicalizePair(a.toUpperCase(), b), { guestLowId: a, guestHighId: b });
  assert.deepEqual(canonicalizePair(b, a), { guestLowId: a, guestHighId: b });
  assert.throws(() => canonicalizePair(a, a.toUpperCase()), /itself/);
  assert.throws(() => canonicalizePair("not-a-uuid", b), /UUID/);
});
