import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const valid = {
  organizationId: id,
  name: "  Launch  ", city: "Singapore", venue: "", expectedAttendees: null,
  startDate: "2026-11-19", endDate: "2026-11-19", startTime: "", endTime: "",
  description: "  Meet people  ", categories: ["Technology"], expectedAudience: [],
  attendeeImport: null, manualGuests: [], staffMembershipIds: [], coverImage: null,
};

test("creation validates and normalizes the full external contract", () => {
  const { createEventSchema } = loadTs("src/modules/events/event-schemas.ts");
  const result = createEventSchema.parse(valid);
  assert.equal(result.name, "Launch");
  assert.equal(result.description, "Meet people");
  assert.equal(result.venue, null);
  assert.equal(result.startTime, null);
  assert.equal(result.endTime, null);
  for (const change of [
    { id: "forged" }, { organizationId: "bad" }, { categories: [] },
    { categories: ["Technology", "Technology"] }, { expectedAudience: ["Unknown"] },
    { expectedAttendees: 1000001 }, { description: " " },
    { manualGuests: [{ firstName: "Ada", email: "not-an-email", guestType: "VIP" }] },
  ]) {
    assert.equal(createEventSchema.safeParse({ ...valid, ...change }).success, false, JSON.stringify(change));
  }
});

test("calendar dates and schedule boundaries are timezone safe", () => {
  const { createEventSchema } = loadTs("src/modules/events/event-schemas.ts");
  const { resolveEventSchedule } = loadTs("src/modules/events/event-schedule.ts");
  assert.equal(createEventSchema.safeParse({ ...valid, startDate: "2026-02-30" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...valid, endDate: "2026-11-18" }).success, false);
  const allDay = resolveEventSchedule(createEventSchema.parse(valid));
  assert.equal(allDay.startsAt, "2026-11-18T16:00:00.000Z");
  assert.equal(allDay.endsAt, "2026-11-19T16:00:00.000Z");
  const atMidnight = resolveEventSchedule(createEventSchema.parse({ ...valid, startTime: "00:00", endTime: "01:00" }));
  assert.equal(atMidnight.startsAt, allDay.startsAt);
  assert.throws(() => resolveEventSchedule(createEventSchema.parse({
    ...valid, city: "Las Vegas, USA", startDate: "2026-03-08", endDate: "2026-03-08", startTime: "02:30", endTime: "04:00",
  })), (error) => Boolean(error.fields?.startTime));
});
