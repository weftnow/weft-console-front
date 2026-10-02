import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { loadTs } from "./load-ts.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const input = {
  organizationId, name: "Launch", city: "Singapore", venue: "", expectedAttendees: 200,
  startDate: "2026-11-19", endDate: "2026-11-19", startTime: "", endTime: "",
  description: "Meet people", categories: ["Technology"], expectedAudience: [],
  attendeeImport: null, manualGuests: [], staffMembershipIds: [], coverImage: null,
};

test("duplicate initial guest emails fail before a repository write", async () => {
  const { createEvent } = loadTs("src/modules/events/server/service.ts");
  let writes = 0;
  const guest = { firstName: "Ada", email: "ADA@example.com", guestType: "VIP" };
  await assert.rejects(createEvent({ userId, organizationId, data: {
    ...input, manualGuests: [guest, { ...guest, email: "ada@example.com" }],
  } }, {
    requireCreator: async () => ({ id: organizationId, name: "Org" }),
    create: async () => { writes++; return {}; },
  }), (error) => error.code === "VALIDATION_ERROR" && Boolean(error.fields?.["manualGuests.1.email"]));
  assert.equal(writes, 0);
});

test("cover bytes are decoded and normalized to bounded WebP", async () => {
  const { normalizeCover } = loadTs("src/modules/events/server/cover-image.ts");
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: "red" } }).png().toBuffer();
  const cover = await normalizeCover(`data:image/png;base64,${png.toString("base64")}`);
  assert.equal(cover.mimeType, "image/webp");
  assert.ok(cover.bytes.length > 0 && cover.bytes.length <= 262144);
  await assert.rejects(normalizeCover("data:image/svg+xml;base64,PHN2Zy8+"), (error) => error.code === "VALIDATION_ERROR");
});

test("organizer detail rejects staff before reading guest data", async () => {
  const { getEvent } = loadTs("src/modules/events/server/service.ts");
  const { requireEventCreator } = loadTs("src/modules/organizations/service.ts");
  let detailedReads = 0;
  await assert.rejects(getEvent({ userId, eventId: "33333333-3333-4333-8333-333333333333" }, {
    findOrganizationId: async () => organizationId,
    requireCreator: (input) => requireEventCreator(input, { findMembership: async () => ({ id: userId, userId, organizationId, role: "staff", active: true }) }),
    findById: async () => { detailedReads++; return null; },
    findCover: async () => null,
  }), (error) => error.code === "FORBIDDEN");
  assert.equal(detailedReads, 0);
});
