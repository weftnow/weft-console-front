import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";
import { event } from "./event-detail-fixture.mjs";

test("merged migration chain preserves applied SQL hashes and timestamps from both branches", () => {
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
  const applied = [
    [5, 1792285386006, "a64f5fa2e99ec04e0c4c201a72c022eb19dfd583ce41bc39e652e98f356172ad"],
    [6, 1792285527533, "3fc6a14eb9e5440b5d0e45b70ec3740167316d9d805c1ecf6abf8d7eb3ec0c3f"],
    [7, 1792304618387, "34771d5aac3bfa7d033f9c4b233594103a34b54f4016eccad1aa612a1820d54b"],
    [8, 1792306996645, "c4eb8072eaa77a7f6e999b9825a00a698f865cfed31498df5fd7129f0995c906"],
    [9, 1792336518894, "29f32bed33ff69fcfb2767298fb460473f3ea85a3090a4a57e86b53d5526ce7b"],
    [10, 1792350213497, "8909ac30b59b7666fd7709401752c6e9f690f09924cec340ac807e608c25ca2b"],
  ];
  for (const [index, timestamp, hash] of applied) {
    const entry = journal.entries[index];
    assert.equal(entry.when, timestamp);
    assert.equal(createHash("sha256").update(readFileSync(`drizzle/${entry.tag}.sql`)).digest("hex"), hash);
  }
  for (const [index, entry] of journal.entries.entries()) {
    assert.equal(entry.idx, index);
    if (index) assert.ok(entry.when > journal.entries[index - 1].when);
    const snapshot = JSON.parse(readFileSync(`drizzle/meta/${String(index).padStart(4, "0")}_snapshot.json`, "utf8"));
    if (index) {
      const previous = JSON.parse(readFileSync(`drizzle/meta/${String(index - 1).padStart(4, "0")}_snapshot.json`, "utf8"));
      assert.equal(snapshot.prevId, previous.id);
    }
  }
  assert.equal(journal.entries[11].tag, "0011_reconcile_console_history");
  assert.equal(journal.entries.at(-1).tag, "0012_f07_matching_change_kinds");
});

test("contact conflict snapshots remain valid independently of networking and profile summaries", () => {
  const { savedEventGuestDtoSchema, eventDetailDtoSchema } = loadTs("src/modules/events/event-dto.ts");
  const guest = {
    id: "11111111-1111-4111-8111-111111111111", personId: "22222222-2222-4222-8222-222222222222", revision: 3,
    firstName: "Ada", lastName: "Guest", email: "ada@example.test", phone: "", company: "Example", position: "Founder",
    profileType: "Investor", guestType: "VIP", linkedin: "", source: "manual", importId: null,
    createdAt: "2026-10-19T00:00:00Z", updatedAt: "2026-10-19T00:00:00Z",
  };
  assert.equal(savedEventGuestDtoSchema.safeParse(guest).success, true);
  assert.equal(eventDetailDtoSchema.safeParse({ ...event, attendees: { ...event.attendees, guests: [guest] } }).success, false);
  const networking = { status: "excluded", excludedAt: "2026-10-19T00:00:00Z", reason: "guest_request", version: 2 };
  const profile = { version: 1, completeness: { goals: "available", offers: "missing", desiredConnections: "missing", background: "missing", linkedin: "url_only" } };
  assert.equal(eventDetailDtoSchema.safeParse({ ...event, attendees: { ...event.attendees, guests: [{ ...guest, networking, profile }] } }).success, true);
});
