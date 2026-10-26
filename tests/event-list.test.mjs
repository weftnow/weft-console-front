import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const row = (overrides) => ({
  id: "33333333-3333-4333-8333-333333333333", name: "Launch", city: "Singapore", venue: "",
  startDate: "2026-11-19", endDate: "2026-11-19", timezone: "Asia/Singapore",
  startsAt: new Date("2026-11-19T01:00:00Z"), endsAt: new Date("2026-11-19T10:00:00Z"),
  guestCount: 2, hasCover: false, ...overrides,
});

test("listEvents maps rows to summaries with a schedule status and protected cover URL", async () => {
  const { listEvents } = loadTs("src/modules/events/server/service.ts");
  const now = new Date("2026-11-19T05:00:00Z");
  let scope;
  const [event] = await listEvents({ userId: "u", organizationId: "o" }, { listForUser: async (...args) => { scope = args; return [row({ hasCover: true })]; } }, now);
  assert.deepEqual(scope, ["u", "o"], "the list is scoped to the selected organization");
  assert.equal(event.status, "live");
  assert.equal(event.startsAt, "2026-11-19T01:00:00.000Z");
  assert.equal(event.coverImage, "/api/events/33333333-3333-4333-8333-333333333333/cover");
  assert.equal(event.guestCount, 2);
});

test("status boundaries follow the schedule: start is live, end is completed", async () => {
  const { listEvents } = loadTs("src/modules/events/server/service.ts");
  const { deriveScheduleStatus } = loadTs("src/modules/events/event-schedule.ts");
  for (const now of [new Date("2026-11-19T00:59:59Z"), new Date("2026-11-19T01:00:00Z"), new Date("2026-11-19T10:00:00Z")]) {
    const [event] = await listEvents({ userId: "u", organizationId: "o" }, { listForUser: async () => [row({})] }, now);
    assert.equal(event.status, deriveScheduleStatus("2026-11-19T01:00:00.000Z", "2026-11-19T10:00:00.000Z", now));
  }
});

test("groupEvents splits by status: upcoming soonest first, completed latest first, all newest first", () => {
  const { groupEvents } = loadTs("src/modules/events/event-list.ts");
  const summary = (id, status, startsAt) => ({ id, status, startsAt, coverImage: null });
  const events = [
    summary("a", "completed", "2026-01-01T00:00:00.000Z"),
    summary("b", "upcoming", "2026-12-01T00:00:00.000Z"),
    summary("c", "live", "2026-10-01T00:00:00.000Z"),
    summary("d", "upcoming", "2026-11-01T00:00:00.000Z"),
    summary("e", "completed", "2026-06-01T00:00:00.000Z"),
  ];
  const grouped = groupEvents(events);
  assert.deepEqual(grouped.live.map((e) => e.id), ["c"]);
  assert.deepEqual(grouped.upcoming.map((e) => e.id), ["d", "b"]);
  assert.deepEqual(grouped.completed.map((e) => e.id), ["e", "a"]);
  assert.deepEqual(grouped.all.map((e) => e.id), ["b", "d", "c", "e", "a"]);
});

test("eventArt uses the uploaded cover or the neutral placeholder, never city art", () => {
  const { eventArt } = loadTs("src/modules/events/event-list.ts");
  const { EVENT_COVER_PLACEHOLDER_ART } = loadTs("src/modules/events/event-record.ts");
  assert.deepEqual(eventArt({ coverImage: null }), EVENT_COVER_PLACEHOLDER_ART);
  assert.equal(eventArt({ coverImage: "/api/events/x/cover" }).image, "/api/events/x/cover");
});

test("formatCountdown reads naturally", () => {
  const { formatCountdown } = loadTs("src/modules/events/event-list.ts");
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(formatCountdown("2026-10-03T18:00:00.000Z", now), "Starts today");
  assert.equal(formatCountdown("2026-10-04T12:00:00.000Z", now), "In 1 day");
  assert.equal(formatCountdown("2026-10-13T12:00:00.000Z", now), "In 10 days");
});
