import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actorId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const organizationId = "33333333-3333-4333-8333-333333333333";
const guestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const schemas = loadTs("src/modules/attendees/profile-schemas.ts");
const { profileCompleteness, profilePresence, shareableSummary, EMPTY_PRESENCE } = loadTs("src/modules/attendees/profile-completeness.ts");
const service = loadTs("src/modules/attendees/server/profile-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

const organizer = { active: true, role: "organizer" };
const event = { id: eventId, organizationId };
const blank = { summary: null, goals: null, offers: null, desiredConnections: null, avoid: null, background: null, linkedinDetails: null, missingDetails: null };
const profile = (overrides = {}) => ({ guestId, version: 0, fields: { ...blank }, organizerOnly: [], savedAt: null, savedBy: null, ...overrides });
const input = (fields = {}, organizerOnly = [], expectedVersion = 0) => ({ fields: { ...blank, ...fields }, organizerOnly, expectedVersion });
const rejects = (fn, code) => assert.throws(fn, (error) => error instanceof ApplicationError && error.code === code);

test("fields are trimmed and blank means unknown (null), never an empty string", () => {
  const parsed = schemas.profileInputSchema.parse({ ...input(), fields: { ...blank, goals: "  Raise a seed round  ", offers: "   ", avoid: "" } });
  assert.equal(parsed.fields.goals, "Raise a seed round");
  assert.equal(parsed.fields.offers, null);
  assert.equal(parsed.fields.avoid, null);
  assert.equal(parsed.fields.background, null);
});

test("field limits: summary 500, other fields 2000", () => {
  assert.equal(schemas.profileInputSchema.safeParse(input({ summary: "x".repeat(500) })).success, true);
  assert.equal(schemas.profileInputSchema.safeParse(input({ summary: "x".repeat(501) })).success, false);
  assert.equal(schemas.profileInputSchema.safeParse(input({ goals: "x".repeat(2000) })).success, true);
  assert.equal(schemas.profileInputSchema.safeParse(input({ goals: "x".repeat(2001) })).success, false);
});

test("input is strict: missing fields, extra keys and a bad expected version are rejected", () => {
  assert.equal(schemas.profileInputSchema.safeParse({ fields: { goals: "a" }, organizerOnly: [], expectedVersion: 0 }).success, false);
  assert.equal(schemas.profileInputSchema.safeParse({ ...input(), userId: actorId }).success, false);
  assert.equal(schemas.profileInputSchema.safeParse({ ...input(), fields: { ...blank, extra: "x" } }).success, false);
  assert.equal(schemas.profileInputSchema.safeParse(input({}, [], -1)).success, false);
  assert.equal(schemas.profileInputSchema.safeParse(input({}, [], 1.5)).success, false);
});

test("organizer-only keys must be matching fields: summary and unknown keys are rejected, duplicates collapse in a fixed order", () => {
  assert.equal(schemas.profileInputSchema.safeParse(input({}, ["summary"])).success, false);
  assert.equal(schemas.profileInputSchema.safeParse(input({}, ["nope"])).success, false);
  assert.deepEqual(schemas.profileInputSchema.parse(input({}, ["background", "goals", "background"])).organizerOnly, ["goals", "background"]);
});

test("profileCompleteness: a LinkedIn URL alone is url_only, never available", () => {
  const withUrl = { linkedin: "linkedin.com/in/ada" };
  const none = { linkedin: "  " };
  assert.deepEqual(profileCompleteness(withUrl, EMPTY_PRESENCE), { goals: "missing", offers: "missing", desiredConnections: "missing", background: "missing", linkedin: "url_only" });
  assert.equal(profileCompleteness(none, EMPTY_PRESENCE).linkedin, "missing");
  const details = profilePresence({ ...blank, linkedinDetails: "Head of Sales at Acme", goals: "Hire" });
  const result = profileCompleteness(none, details);
  assert.equal(result.linkedin, "available");
  assert.equal(result.goals, "available");
  assert.equal(result.background, "missing");
});

test("shareableSummary hides organizer-only fields but keeps the rest, and never lists unknown fields", () => {
  const saved = profile({
    version: 2,
    fields: { ...blank, summary: "Founder of Acme", goals: "Raise a seed round", avoid: "Competitor X", background: "Ex-banker" },
    organizerOnly: ["avoid"],
  });
  const summary = shareableSummary(saved);
  assert.equal(summary.summary, "Founder of Acme");
  assert.deepEqual(summary.details.map((detail) => detail.key), ["goals", "background"]);
  assert.doesNotMatch(JSON.stringify(summary), /Competitor X/);
  assert.deepEqual(shareableSummary(profile()), { summary: null, details: [] });
});

test("only active owners and organizers save profiles", () => {
  for (const membership of [{ active: true, role: "staff" }, { active: true, role: "sponsor" }, { active: false, role: "owner" }, null]) {
    rejects(() => service.decideProfileSave({ membership, event, profile: profile() }, input({ goals: "a" })), "FORBIDDEN");
  }
  for (const role of ["owner", "organizer"]) {
    assert.equal(service.decideProfileSave({ membership: { active: true, role }, event, profile: profile() }, input({ goals: "a" })).kind, "save");
  }
});

test("decisions distinguish missing event, missing guest, no-op and stale version", () => {
  const changed = input({ goals: "a" });
  rejects(() => service.decideProfileSave({ membership: organizer, event: null, profile: null }, changed), "NOT_FOUND");
  rejects(() => service.decideProfileSave({ membership: organizer, event, profile: null }, changed), "NOT_FOUND");

  const saved = profile({ version: 3, fields: { ...blank, goals: "a" } });
  assert.deepEqual(service.decideProfileSave({ membership: organizer, event, profile: saved }, input({ goals: "a" }, [], 3)), { kind: "noop", profile: saved });
  assert.equal(service.decideProfileSave({ membership: organizer, event, profile: saved }, input({ goals: "a" }, [], 1)).kind, "noop", "identical content is a no-op even when the version is stale");
  assert.equal(service.decideProfileSave({ membership: organizer, event, profile: saved }, input({ goals: "b" }, [], 3)).kind, "save");
  assert.throws(() => service.decideProfileSave({ membership: organizer, event, profile: saved }, input({ goals: "b" }, [], 2)), (error) => {
    assert.equal(error.code, "CONFLICT");
    assert.deepEqual(error.latest, saved);
    return true;
  });
});

test("an empty first save and a changed organizer-only flag are handled", () => {
  assert.equal(service.decideProfileSave({ membership: organizer, event, profile: profile() }, input()).kind, "noop", "saving nothing does not create version 1");
  const saved = profile({ version: 1, fields: { ...blank, goals: "a" } });
  assert.equal(service.decideProfileSave({ membership: organizer, event, profile: saved }, input({ goals: "a" }, ["goals"], 1)).kind, "save", "hiding a field is a real change");
});

function dependencies(overrides = {}) {
  const calls = { authorize: 0, lock: 0 };
  return {
    calls,
    value: {
      findOrganizationId: async () => organizationId,
      requireCreator: async () => { calls.authorize++; },
      findProfile: async () => ({ profile: profile({ version: 1, fields: { ...blank, goals: "a" } }), linkedin: "" }),
      withLockedProfile: async () => { calls.lock++; return { profile: profile({ version: 1 }), changed: true, linkedin: "" }; },
      ...overrides,
    },
  };
}

test("the service authorizes before reading or locking, and never locks for malformed requests", async () => {
  const forbidden = dependencies({ requireCreator: async () => { throw new ApplicationError("FORBIDDEN", "no"); } });
  await assert.rejects(service.saveGuestProfile({ userId: actorId, eventId, guestId, data: input({ goals: "a" }) }, forbidden.value), { code: "FORBIDDEN" });
  await assert.rejects(service.getGuestProfile({ userId: actorId, eventId, guestId }, forbidden.value), { code: "FORBIDDEN" });
  assert.equal(forbidden.calls.lock, 0);

  const malformed = dependencies();
  await assert.rejects(service.saveGuestProfile({ userId: actorId, eventId, guestId, data: { fields: {} } }, malformed.value), { code: "VALIDATION_ERROR" });
  await assert.rejects(service.saveGuestProfile({ userId: actorId, eventId, guestId: "nope", data: input() }, malformed.value), { code: "NOT_FOUND" });
  await assert.rejects(service.saveGuestProfile({ userId: actorId, eventId: "nope", guestId, data: input() }, malformed.value), { code: "NOT_FOUND" });
  assert.equal(malformed.calls.lock, 0);

  const missing = dependencies({ findOrganizationId: async () => null });
  await assert.rejects(service.getGuestProfile({ userId: actorId, eventId, guestId }, missing.value), { code: "NOT_FOUND" });
  const noGuest = dependencies({ findProfile: async () => null });
  await assert.rejects(service.getGuestProfile({ userId: actorId, eventId, guestId }, noGuest.value), { code: "NOT_FOUND" });
});

test("reading and saving return the profile with completeness and the shareable summary", async () => {
  const read = await service.getGuestProfile({ userId: actorId, eventId, guestId }, dependencies({
    findProfile: async () => ({ profile: profile({ version: 2, fields: { ...blank, goals: "a", avoid: "secret" }, organizerOnly: ["avoid"] }), linkedin: "linkedin.com/in/ada" }),
  }).value);
  assert.equal(read.completeness.goals, "available");
  assert.equal(read.completeness.linkedin, "url_only");
  assert.doesNotMatch(JSON.stringify(read.summary), /secret/);
  assert.equal(read.profile.fields.avoid, "secret", "the editor still sees organizer-only text");

  const allowed = dependencies();
  const saved = await service.saveGuestProfile({ userId: actorId, eventId, guestId, data: input({ goals: "a" }) }, allowed.value);
  assert.equal(saved.changed, true);
  assert.equal(saved.read.profile.version, 1);
  assert.equal(allowed.calls.authorize, 1);
  assert.equal(allowed.calls.lock, 1);
});
