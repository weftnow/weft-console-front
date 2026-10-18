import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { networkingSettingsSchema, settingsUpdateSchema, wefterAssignmentSchema, scheduleIntervalsValid, settingsTimesValid } = loadTs("src/modules/events/settings-schemas.ts");
const uuid = "11111111-1111-4111-8111-111111111111";
const base = { networkingWindows: [], stopNewIntroductionsAt: null, landmarks: [], softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: null, dispatchAcknowledgmentMinutes: null, missedMeetingMinutes: null };

test("valid empty and partial settings remain explicit and do not invent defaults", () => {
  assert.deepEqual(networkingSettingsSchema.parse(base), base);
  const partial = { ...base, networkingWindows: [{ startsAt: "2026-11-01T15:00:00Z", endsAt: "2026-11-01T16:00:00Z" }], landmarks: [{ id: uuid, name: "North lounge", directions: null }] };
  assert.deepEqual(networkingSettingsSchema.parse(partial), partial);
});

test("settings and schedule writes reject unknown fields, malformed intervals, and nonpositive limits", () => {
  assert.equal(settingsUpdateSchema.safeParse({ expectedRevision: 0, settings: { ...base, suggested: 5 } }).success, false);
  assert.equal(networkingSettingsSchema.safeParse({ ...base, softMaxIntroductionsPerGuest: 0 }).success, false);
  assert.equal(networkingSettingsSchema.safeParse({ ...base, networkingWindows: [{ startsAt: "tomorrow", endsAt: "later" }] }).success, false);
  assert.equal(wefterAssignmentSchema.safeParse({ expectedRevision: 0, assigned: true, availabilityWindows: [], available: true }).success, false);
});

test("Wefter assignment supports empty schedules and arbitrary schedule interval counts", () => {
  const availabilityWindows = Array.from({ length: 12 }, (_, index) => ({ startsAt: `2026-11-01T${String(index).padStart(2,"0")}:00:00Z`, endsAt: `2026-11-01T${String(index).padStart(2,"0")}:30:00Z` }));
  assert.equal(wefterAssignmentSchema.safeParse({ expectedRevision: 0, assigned: true, availabilityWindows }).success, true);
  assert.equal(wefterAssignmentSchema.safeParse({ expectedRevision: 0, assigned: true, availabilityWindows: [] }).success, true);
});

test("event windows stay within event boundaries and cannot overlap", () => {
  const bounds = ["2026-11-01T14:00:00.000Z", "2026-11-01T20:00:00.000Z"];
  assert.equal(scheduleIntervalsValid([{ startsAt: "2026-11-01T15:00:00.000Z", endsAt: "2026-11-01T16:00:00.000Z" }], ...bounds), true);
  assert.equal(scheduleIntervalsValid([{ startsAt: "2026-11-01T13:00:00.000Z", endsAt: "2026-11-01T16:00:00.000Z" }], ...bounds), false);
  assert.equal(scheduleIntervalsValid([{ startsAt: "2026-11-01T15:00:00.000Z", endsAt: "2026-11-01T17:00:00.000Z" }, { startsAt: "2026-11-01T16:00:00.000Z", endsAt: "2026-11-01T18:00:00.000Z" }], ...bounds), false);
  assert.equal(settingsTimesValid({ ...base, stopNewIntroductionsAt: "2026-11-01T21:00:00.000Z" }, ...bounds), false);
});
