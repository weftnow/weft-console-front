import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const eventId = "33333333-3333-4333-8333-333333333333";
const organizationId = "22222222-2222-4222-8222-222222222222";
const { updateEventLanguage } = loadTs("src/modules/events/server/language-service.ts");

function deps({ allowed = true, exists = true, changed = true } = {}) {
  const calls = { saved: [] };
  return { calls, deps: {
    findOrganizationId: async () => (exists ? organizationId : null),
    requireCreator: async () => { if (!allowed) throw Object.assign(new Error("denied"), { code: "FORBIDDEN" }); return { id: organizationId, name: "Org" }; },
    save: async (input) => { calls.saved.push(input); return { changed }; },
  } };
}

test("an Owner or Organizer saves the event language", async () => {
  const { calls, deps: d } = deps();
  assert.deepEqual(await updateEventLanguage({ userId, eventId, data: { language: "es" } }, d), { language: "es", changed: true });
  assert.deepEqual(calls.saved, [{ eventId, userId, language: "es" }]);
});

test("an unchanged language reports no change", async () => {
  const { deps: d } = deps({ changed: false });
  assert.equal((await updateEventLanguage({ userId, eventId, data: { language: "en" } }, d)).changed, false);
});

test("other callers are denied before anything is written", async () => {
  const { calls, deps: d } = deps({ allowed: false });
  await assert.rejects(updateEventLanguage({ userId, eventId, data: { language: "es" } }, d), (error) => error.code === "FORBIDDEN");
  assert.equal(calls.saved.length, 0);
});

test("unknown events, bad IDs and unsupported languages are rejected", async () => {
  const missing = deps({ exists: false });
  await assert.rejects(updateEventLanguage({ userId, eventId, data: { language: "es" } }, missing.deps), (error) => error.code === "NOT_FOUND");
  await assert.rejects(updateEventLanguage({ userId, eventId: "nope", data: { language: "es" } }, deps().deps), (error) => error.code === "NOT_FOUND");
  for (const data of [{ language: "fr" }, {}, { language: "es", extra: 1 }, null]) {
    const { calls, deps: d } = deps();
    await assert.rejects(updateEventLanguage({ userId, eventId, data }, d), (error) => error.code === "VALIDATION_ERROR");
    assert.equal(calls.saved.length, 0);
  }
});

test("creating an event accepts only supported languages and defaults to English", () => {
  const { createEventSchema } = loadTs("src/modules/events/event-schemas.ts");
  const valid = {
    organizationId, name: "Launch", city: "Singapore", venue: "", expectedAttendees: 200,
    startDate: "2026-11-19", endDate: "2026-11-19", startTime: "", endTime: "",
    description: "Meet people", categories: ["Technology"], expectedAudience: [],
    attendeeImport: null, manualGuests: [], staffMembershipIds: [], coverImage: null,
  };
  assert.equal(createEventSchema.parse(valid).language, "en");
  assert.equal(createEventSchema.parse({ ...valid, language: "es" }).language, "es");
  assert.equal(createEventSchema.safeParse({ ...valid, language: "fr" }).success, false);
});
