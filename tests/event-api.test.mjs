import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const actor = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ada", avatarUrl: null };
const { handleCreateEvent } = loadTs("src/infrastructure/http/create-event-handler.ts");
const { handleGetEventCover } = loadTs("src/infrastructure/http/get-event-cover-handler.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");
const event = {
  id: "33333333-3333-4333-8333-333333333333", organizationId: "22222222-2222-4222-8222-222222222222",
  name: "Launch", city: "Singapore", venue: "", description: "Meet people", expectedAttendees: null,
  categories: ["Technology"], expectedAudience: [], startDate: "2026-11-19", endDate: "2026-11-19",
  startTime: "", endTime: "", timezone: "Asia/Singapore",
  startsAt: "2026-11-18T16:00:00.000Z", endsAt: "2026-11-19T16:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
  coverImage: null, attendees: { guests: [], imported: null }, staff: [],
};

function request(body = "{}", headers = {}) {
  return new Request("https://weft.example/api/events", { method: "POST", body, headers: {
    origin: "https://weft.example", "content-type": "application/json", ...headers,
  } });
}

test("anonymous event creation returns 401 before accepting body identity", async () => {
  const response = await handleCreateEvent(request(JSON.stringify({ userId: actor.id })), {
    getCurrentUser: async () => null, createEvent: async () => { throw new Error("must not run"); },
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHORIZED");
});

test("creation rejects cross-origin and oversized streamed JSON", async () => {
  const dependencies = { getCurrentUser: async () => actor, createEvent: async () => ({ id: actor.id }) };
  assert.equal((await handleCreateEvent(request("{}", { origin: "https://evil.example" }), dependencies)).status, 403);
  assert.equal((await handleCreateEvent(request("x".repeat(3 * 1024 * 1024 + 1)), dependencies)).status, 413);
  assert.equal((await handleCreateEvent(request("{"), dependencies)).status, 400);
  assert.equal((await handleCreateEvent(request("{}", { "content-type": "text/plain" }), dependencies)).status, 415);
});

test("creation returns a validated event and Location", async () => {
  const response = await handleCreateEvent(request("{}"), {
    getCurrentUser: async () => actor, createEvent: async () => event,
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("location"), `/events/${event.id}`);
  assert.equal((await response.json()).data.event.id, event.id);
});

test("creation rejects a successful payload with an untrusted cover URL", async () => {
  const originalLog = console.error;
  console.error = () => {};
  try {
    const response = await handleCreateEvent(request("{}"), {
      getCurrentUser: async () => actor,
      createEvent: async () => ({ ...event, coverImage: "https://evil.example/cover.webp" }),
    });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /evil\.example/);
  } finally { console.error = originalLog; }
});

test("known field errors and unexpected SQL errors use safe responses", async () => {
  const validation = await handleCreateEvent(request("{}"), {
    getCurrentUser: async () => actor,
    createEvent: async () => { throw new ApplicationError("VALIDATION_ERROR", "Check fields.", { name: "Required" }); },
  });
  assert.equal(validation.status, 422);
  assert.equal((await validation.json()).error.fields.name, "Required");
  const originalLog = console.error;
  let logged = "";
  console.error = (...parts) => { logged = JSON.stringify(parts); };
  try {
    const failed = await handleCreateEvent(request("{}"), {
      getCurrentUser: async () => actor,
      createEvent: async () => { throw new Error("postgresql://secret SQL guest@example.com"); },
    });
    assert.equal(failed.status, 500);
    assert.doesNotMatch(await failed.text(), /secret|guest@example.com|postgresql:/);
    assert.doesNotMatch(logged, /secret|guest@example.com|postgresql:/);
  } finally { console.error = originalLog; }
});

test("cover endpoint denies anonymous and forbidden reads", async () => {
  const missing = await handleGetEventCover(event.id, {
    getCurrentUser: async () => null, getEventCover: async () => { throw new Error("must not run"); },
  });
  assert.equal(missing.status, 401);
  const forbidden = await handleGetEventCover(event.id, {
    getCurrentUser: async () => actor,
    getEventCover: async () => { throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization."); },
  });
  assert.equal(forbidden.status, 403);
});
