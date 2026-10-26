import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { eventTimeInstant, localEventTime, describeIntervals, describeSetting } = loadTs("src/modules/events/event-form.ts");

test("event form times round trip in the event zone and reject ambiguous/nonexistent local times", () => {
  assert.equal(eventTimeInstant("2026-11-19T09:30", "Asia/Singapore"), "2026-11-19T01:30:00Z");
  assert.equal(localEventTime("2026-11-19T01:30:00Z", "Asia/Singapore"), "2026-11-19T09:30");
  assert.equal(eventTimeInstant("", "Asia/Singapore"), "");
  assert.equal(localEventTime(null, "Asia/Singapore"), "");
  assert.throws(() => eventTimeInstant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => eventTimeInstant("2026-11-01T01:30", "America/New_York"));
});

test("conflict comparisons preserve unknown values and present places and incomplete draft hours readably", () => {
  const settings = { networkingWindows: [], landmarks: [{ name: "Lobby", directions: "Beside reception" }], stopNewIntroductionsAt: null, softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: 10 };
  assert.equal(describeSetting("softMaxIntroductionsPerGuest", settings, "UTC"), "Not set");
  assert.equal(describeSetting("locationFreshnessMinutes", settings, "UTC"), "10 minutes");
  assert.equal(describeSetting("landmarks", settings, "UTC"), "Lobby — Beside reception");
  assert.equal(describeIntervals([{ startsAt: "", endsAt: "" }], "UTC"), "Start not set – End not set");
});
