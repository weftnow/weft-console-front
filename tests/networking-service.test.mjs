import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actorId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const guestA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guestB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const blockId = "44444444-4444-4444-8444-444444444444";

const { participationInputSchema, matchBlockInputSchema, EXCLUSION_REASONS } = loadTs("src/modules/attendees/networking-schemas.ts");
const { canonicalPair, isBlockedPair, isIncludedInMatching } = loadTs("src/modules/attendees/networking-eligibility.ts");
const service = loadTs("src/modules/attendees/server/networking-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

const organizer = { active: true, role: "organizer" };
const event = { id: eventId, organizationId };
const participation = (overrides = {}) => ({ guestId: guestA, status: "included", excludedAt: null, reason: null, version: 1, ...overrides });
const rejects = (fn, code) => assert.throws(fn, (error) => error instanceof ApplicationError && error.code === code);

test("exclusion needs a reason from the fixed list and an expected version", () => {
  assert.deepEqual([...EXCLUSION_REASONS], ["guest_request", "organizer_decision", "not_attending", "other"]);
  assert.equal(participationInputSchema.safeParse({ status: "excluded", expectedVersion: 1 }).success, false);
  assert.equal(participationInputSchema.safeParse({ status: "excluded", reason: "because", expectedVersion: 1 }).success, false);
  assert.equal(participationInputSchema.safeParse({ status: "excluded", reason: "other", expectedVersion: 0 }).success, false);
  assert.equal(participationInputSchema.safeParse({ status: "excluded", reason: "other", expectedVersion: 1 }).success, true);
  assert.equal(participationInputSchema.safeParse({ status: "included", expectedVersion: 3 }).success, true);
  assert.equal(participationInputSchema.safeParse({ status: "included", expectedVersion: 3, reason: "other" }).success, false);
  assert.equal(participationInputSchema.safeParse({ status: "included", expectedVersion: 1, userId: actorId }).success, false);
});

test("do-not-match input rejects the same guest twice and extra fields", () => {
  assert.equal(matchBlockInputSchema.safeParse({ guestIds: [guestA, guestA] }).success, false);
  assert.equal(matchBlockInputSchema.safeParse({ guestIds: [guestA] }).success, false);
  assert.equal(matchBlockInputSchema.safeParse({ guestIds: [guestA, guestB], organizationId }).success, false);
  assert.equal(matchBlockInputSchema.safeParse({ guestIds: [guestA, guestB], reason: "x".repeat(501) }).success, false);
  assert.equal(matchBlockInputSchema.parse({ guestIds: [guestA, guestB], reason: "  " }).reason, null);
});

test("canonical pairs treat A+B and B+A as one restriction", () => {
  assert.deepEqual(canonicalPair(guestB, guestA), [guestA, guestB]);
  assert.deepEqual(canonicalPair(guestA, guestB), [guestA, guestB]);
  const blocks = [{ guestIds: [guestA, guestB] }];
  assert.equal(isBlockedPair(blocks, guestB, guestA), true);
  assert.equal(isBlockedPair(blocks, guestA, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"), false);
  assert.equal(isIncludedInMatching({ networking: { status: "included" } }), true);
  assert.equal(isIncludedInMatching({ networking: { status: "excluded" } }), false);
});

test("only active owners and organizers decide participation; staff, sponsors and inactive members are forbidden", () => {
  const input = { status: "excluded", reason: "other", expectedVersion: 1 };
  for (const membership of [{ active: true, role: "staff" }, { active: true, role: "sponsor" }, { active: false, role: "owner" }, null]) {
    rejects(() => service.decideParticipationChange({ membership, event, guest: participation() }, input), "FORBIDDEN");
  }
  for (const role of ["owner", "organizer"]) {
    assert.equal(service.decideParticipationChange({ membership: { active: true, role }, event, guest: participation() }, input).kind, "update");
  }
});

test("participation decisions distinguish missing event, missing guest, stale version and no-op", () => {
  const input = { status: "excluded", reason: "guest_request", expectedVersion: 1 };
  rejects(() => service.decideParticipationChange({ membership: organizer, event: null, guest: null }, input), "NOT_FOUND");
  rejects(() => service.decideParticipationChange({ membership: organizer, event, guest: null }, input), "NOT_FOUND");
  const latest = participation({ version: 2 });
  assert.throws(() => service.decideParticipationChange({ membership: organizer, event, guest: latest }, input), (error) => {
    assert.equal(error.code, "CONFLICT");
    assert.deepEqual(error.latest, latest);
    return true;
  });
  const already = participation({ status: "excluded", reason: "other", excludedAt: "2026-10-18T00:00:00.000Z", version: 4 });
  assert.deepEqual(service.decideParticipationChange({ membership: organizer, event, guest: already }, input), { kind: "noop", participation: already });
});

test("match block decisions reject unknown guests, return an existing pair and store canonical order", () => {
  const base = { membership: organizer, event, knownGuestIds: new Set([guestA, guestB]), existingBlock: null };
  const reversed = { guestIds: [guestB, guestA], reason: "Competitors" };
  assert.deepEqual(service.decideMatchBlock(base, reversed), { kind: "create", pair: [guestA, guestB], reason: "Competitors" });
  rejects(() => service.decideMatchBlock({ ...base, knownGuestIds: new Set([guestA]) }, reversed), "VALIDATION_ERROR");
  rejects(() => service.decideMatchBlock(base, { guestIds: [guestA, guestA] }), "VALIDATION_ERROR");
  rejects(() => service.decideMatchBlock({ ...base, membership: { active: true, role: "staff" } }, reversed), "FORBIDDEN");
  rejects(() => service.decideMatchBlock({ ...base, event: null }, reversed), "NOT_FOUND");
  const existing = { id: blockId, guestIds: [guestA, guestB], reason: null, createdAt: "2026-10-18T00:00:00.000Z" };
  assert.deepEqual(service.decideMatchBlock({ ...base, existingBlock: existing }, reversed), { kind: "existing", block: existing });
});

test("block removal needs a block on this event and operator access", () => {
  const block = { id: blockId, guestIds: [guestA, guestB], reason: null, createdAt: "2026-10-18T00:00:00.000Z" };
  assert.equal(service.decideMatchBlockRemoval({ membership: organizer, event, block }), block);
  rejects(() => service.decideMatchBlockRemoval({ membership: organizer, event, block: null }), "NOT_FOUND");
  rejects(() => service.decideMatchBlockRemoval({ membership: { active: true, role: "staff" }, event, block }), "FORBIDDEN");
});

function dependencies(overrides = {}) {
  const calls = { authorize: 0, lock: 0 };
  return {
    calls,
    value: {
      findOrganizationId: async () => organizationId,
      requireCreator: async () => { calls.authorize++; },
      withLockedParticipation: async () => { calls.lock++; return { participation: participation(), changed: true }; },
      withLockedMatchBlock: async () => { calls.lock++; throw new Error("unused"); },
      withLockedBlockRemoval: async () => { calls.lock++; },
      ...overrides,
    },
  };
}

test("the service authorizes before taking any lock and never locks for forbidden or malformed requests", async () => {
  const data = { status: "excluded", reason: "other", expectedVersion: 1 };
  const forbidden = dependencies({ requireCreator: async () => { throw new ApplicationError("FORBIDDEN", "no"); } });
  await assert.rejects(service.updateGuestParticipation({ userId: actorId, eventId, guestId: guestA, data }, forbidden.value), { code: "FORBIDDEN" });
  assert.equal(forbidden.calls.lock, 0);

  const malformed = dependencies();
  await assert.rejects(service.updateGuestParticipation({ userId: actorId, eventId, guestId: guestA, data: { status: "excluded", expectedVersion: 1 } }, malformed.value), { code: "VALIDATION_ERROR" });
  await assert.rejects(service.updateGuestParticipation({ userId: actorId, eventId, guestId: "nope", data }, malformed.value), { code: "NOT_FOUND" });
  await assert.rejects(service.updateGuestParticipation({ userId: actorId, eventId: "nope", guestId: guestA, data }, malformed.value), { code: "NOT_FOUND" });
  await assert.rejects(service.removeMatchBlock({ userId: actorId, eventId, blockId: "nope" }, malformed.value), { code: "NOT_FOUND" });
  assert.equal(malformed.calls.lock, 0);

  const missing = dependencies({ findOrganizationId: async () => null });
  await assert.rejects(service.addMatchBlock({ userId: actorId, eventId, data: { guestIds: [guestA, guestB] } }, missing.value), { code: "NOT_FOUND" });
  assert.equal(missing.calls.lock, 0);

  const allowed = dependencies();
  const result = await service.updateGuestParticipation({ userId: actorId, eventId, guestId: guestA, data }, allowed.value);
  assert.equal(result.changed, true);
  assert.equal(allowed.calls.authorize, 1);
  assert.equal(allowed.calls.lock, 1);
});
