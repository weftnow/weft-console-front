import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";
import { stubI18n } from "./i18n-stub.mjs";

const i18n = stubI18n();

const { eventTimeInstant, localEventTime, describeIntervals, describeSetting } = loadTs("src/modules/events/event-form.ts");
const { resolveEventSchedule } = loadTs("src/modules/events/event-schedule.ts");

test("event form times round trip in the event zone and reject ambiguous/nonexistent local times", () => {
  assert.equal(eventTimeInstant("2026-11-19T09:30", "Asia/Singapore"), "2026-11-19T01:30:00Z");
  assert.equal(localEventTime("2026-11-19T01:30:00Z", "Asia/Singapore"), "2026-11-19T09:30");
  assert.equal(eventTimeInstant("", "Asia/Singapore"), "");
  assert.equal(localEventTime(null, "Asia/Singapore"), "");
  assert.throws(() => eventTimeInstant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => eventTimeInstant("2026-11-01T01:30", "America/New_York"));
});

test("new Latin American event cities resolve their local timezone", () => {
  const cities = [
    ["Bogotá, Colombia", "America/Bogota", "2026-11-19T14:00:00.000Z"],
    ["Medellín, Colombia", "America/Bogota", "2026-11-19T14:00:00.000Z"],
    ["Mexico City, Mexico", "America/Mexico_City", "2026-11-19T15:00:00.000Z"],
    ["Buenos Aires, Argentina", "America/Argentina/Buenos_Aires", "2026-11-19T12:00:00.000Z"],
  ];

  for (const [city, timezone, startsAt] of cities) {
    assert.deepEqual(resolveEventSchedule({ city, startDate: "2026-11-19", endDate: "2026-11-19", startTime: "09:00", endTime: "10:00" }), {
      timezone,
      startsAt,
      endsAt: new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString(),
    });
  }
});

test("conflict comparisons preserve unknown values and present places and incomplete draft hours readably", () => {
  const settings = { networkingWindows: [], landmarks: [{ name: "Lobby", directions: "Beside reception" }], stopNewIntroductionsAt: null, softMaxIntroductionsPerGuest: null, locationFreshnessMinutes: 10 };
  assert.equal(describeSetting(i18n, "softMaxIntroductionsPerGuest", settings, "UTC"), "Not set");
  assert.equal(describeSetting(i18n, "locationFreshnessMinutes", settings, "UTC"), "10 minutes");
  assert.equal(describeSetting(i18n, "landmarks", settings, "UTC"), "Lobby — Beside reception");
  assert.equal(describeIntervals(i18n, [{ startsAt: "", endsAt: "" }], "UTC"), "Start not set – End not set");
});

test("settings descriptions follow the language", () => {
  const spanish = stubI18n("es");
  assert.equal(describeIntervals(spanish, [{ startsAt: "", endsAt: "" }], "UTC"), "Inicio sin definir – Fin sin definir");
  stubI18n("en");
});
