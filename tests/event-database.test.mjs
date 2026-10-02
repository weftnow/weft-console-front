import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const require = createRequire(import.meta.url);

test("database access fails closed without runtime configuration", () => {
  assert.ok(existsSync("src/infrastructure/database/client.ts"));
  const { getDatabase } = loadTs("src/infrastructure/database/client.ts");
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try { assert.throws(() => getDatabase(), /DATABASE_URL/); }
  finally { if (original) process.env.DATABASE_URL = original; }
});

test("remote PostgreSQL connections require TLS", () => {
  const { getDatabase } = loadTs("src/infrastructure/database/client.ts");
  const original = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://user:password@db.example.test/database?sslmode=disable";
  try { assert.throws(() => getDatabase(), /TLS/); }
  finally { if (original) process.env.DATABASE_URL = original; else delete process.env.DATABASE_URL; }
});

test("generated migration and metadata are checked in together", () => {
  assert.ok(existsSync("drizzle/meta/_journal.json"));
});

test("isolated database enforces event constraints and rolls back", {
  skip: process.env.WEFT_DATABASE_TEST !== "1",
}, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_TEST_URL, max: 1 });
  const client = await pool.connect();
  const userId = randomUUID();
  const organizationId = randomUUID();
  try {
    const migration = await client.query("select count(*)::integer as count from drizzle.__drizzle_migrations");
    assert.ok(migration.rows[0].count >= 1, "apply the generated migration to the isolated test database first");
    await client.query("begin");
    await client.query("insert into users (id, display_name) values ($1, 'Test actor')", [userId]);
    await client.query("insert into organizations (id, name) values ($1, 'Test organization')", [organizationId]);
    await assert.rejects(client.query(`insert into events
      (organization_id, creator_id, name, description, city, categories, start_date, end_date, timezone, starts_at, ends_at)
      values ($1, $2, 'A', 'A', 'Unknown', ARRAY['Technology'], '2026-11-19', '2026-11-19', 'Asia/Singapore', '2026-11-19T00:00:00Z', '2026-11-20T00:00:00Z')`, [organizationId, userId]), (error) => error.code === "23514");
  } finally {
    await client.query("rollback");
    client.release();
    await pool.end();
  }
});

test("isolated database persists the authorized event and rolls back failed child inserts", {
  skip: process.env.WEFT_DATABASE_TEST !== "1",
}, async () => {
  assert.ok(process.env.DATABASE_TEST_URL, "DATABASE_TEST_URL is required when WEFT_DATABASE_TEST=1");
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_TEST_URL, max: 2 });
  const previousRuntimeUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
  const userId = randomUUID();
  const staffUserId = randomUUID();
  const outsiderId = randomUUID();
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const creatorMembershipId = randomUUID();
  const staffMembershipId = randomUUID();
  const outsiderMembershipId = randomUUID();
  const sponsorId = randomUUID();
  const inactiveOrganizerId = randomUUID();
  const sponsorMembershipId = randomUUID();
  const inactiveMembershipId = randomUUID();
  const eventName = `Transaction ${randomUUID()}`;
  try {
    await pool.query("insert into users (id, display_name) values ($1, 'Creator'), ($2, 'Staff'), ($3, 'Outsider')", [userId, staffUserId, outsiderId]);
    await pool.query("insert into organizations (id, name) values ($1, 'Test organization'), ($2, 'Other organization')", [organizationId, otherOrganizationId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role) values ($1, $2, $3, 'owner'), ($4, $2, $5, 'staff'), ($6, $7, $8, 'staff')", [creatorMembershipId, organizationId, userId, staffMembershipId, staffUserId, outsiderMembershipId, otherOrganizationId, outsiderId]);
    await pool.query("insert into users (id, display_name) values ($1, 'Sponsor'), ($2, 'Inactive organizer')", [sponsorId, inactiveOrganizerId]);
    await pool.query("insert into organization_memberships (id, organization_id, user_id, role, active) values ($1, $2, $3, 'sponsor', true), ($4, $2, $5, 'organizer', false)", [sponsorMembershipId, organizationId, sponsorId, inactiveMembershipId, inactiveOrganizerId]);
    const { createEventSchema } = loadTs("src/modules/events/event-schemas.ts");
    const { resolveEventSchedule } = loadTs("src/modules/events/event-schedule.ts");
    const { createEvent, getEvent, getEventCover } = loadTs("src/modules/events/server/service.ts");
    const repository = loadTs("src/modules/events/server/repository.ts");
    const png = await sharp({ create: { width: 12, height: 12, channels: 3, background: "blue" } }).png().toBuffer();
    const input = {
      organizationId, name: eventName, city: "Singapore", venue: "", expectedAttendees: 200,
      startDate: "2026-11-19", endDate: "2026-11-19", startTime: "", endTime: "",
      description: "A real test event", categories: ["Technology"], expectedAudience: [],
      attendeeImport: { fileName: "guests.csv", csvText: "First Name,Email,Guest Type\nAda,ada@example.com,VIP\n" },
      manualGuests: [{ firstName: "Bob", email: "bob@example.com", guestType: "Attendee" }],
      staffMembershipIds: [staffMembershipId], coverImage: `data:image/png;base64,${png.toString("base64")}`,
    };
    const created = await createEvent({ userId, organizationId, data: input });
    assert.match(created.id, /^[0-9a-f-]{36}$/);
    assert.equal(created.attendees.guests.length, 2);
    assert.equal(created.attendees.imports[0].storedCount, 1);
    assert.equal(created.attendees.importCount, 1);
    assert.match(created.attendees.guests[0].id, /^[0-9a-f-]{36}$/);
    assert.equal(created.attendees.guests[0].importId, created.attendees.imports[0].id);
    assert.equal(created.attendees.guests[1].importId, null);
    assert.ok(created.attendees.guests[0].createdAt);
    assert.equal((await getEvent({ userId, eventId: created.id })).attendees.importCount, 1);
    assert.equal(created.staff.length, 1);
    assert.equal(created.coverImage, `/api/events/${created.id}/cover`);
    const fresh = await pool.query("select id from events where id = $1", [created.id]);
    assert.equal(fresh.rows[0].id, created.id);
    assert.equal((await getEvent({ userId, eventId: created.id })).attendees.guests.length, 2);
    assert.ok((await getEventCover({ userId, eventId: created.id })).bytes.length > 0);
    const listed = await repository.listForUser(userId, organizationId);
    const summary = listed.find((event) => event.id === created.id);
    assert.equal(summary?.guestCount, 2);
    assert.equal(summary?.hasCover, true);
    assert.equal((await repository.listForUser(outsiderId, organizationId)).some((event) => event.id === created.id), false);
    assert.equal((await repository.listForUser(staffUserId, organizationId)).some((event) => event.id === created.id), false);
    assert.equal((await repository.listForUser(sponsorId, organizationId)).some((event) => event.id === created.id), false);
    assert.equal((await repository.listForUser(inactiveOrganizerId, organizationId)).some((event) => event.id === created.id), false);
    assert.equal((await repository.listForUser(userId, otherOrganizationId)).some((event) => event.id === created.id), false, "the list is scoped to the selected organization");
    await assert.rejects(getEvent({ userId: outsiderId, eventId: created.id }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(getEventCover({ userId: outsiderId, eventId: created.id }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(createEvent({ userId, organizationId, data: { ...input, name: `${eventName} cross-org`, staffMembershipIds: [outsiderMembershipId] } }), (error) => error.code === "VALIDATION_ERROR");
    const data = createEventSchema.parse({ ...input, name: `${eventName} rollback`, attendeeImport: null, manualGuests: [], staffMembershipIds: [], coverImage: null });
    const guest = { firstName: "Ada", lastName: "", email: "ada@example.com", phone: "", company: "", position: "", profileType: "", linkedin: "", guestType: "VIP", source: "manual" };
    await assert.rejects(repository.create({ userId, organizationId, data, schedule: resolveEventSchedule(data), guests: [guest, guest], imported: null, cover: null }), (error) => (error.cause ?? error).code === "23505");
    const rolledBack = await pool.query("select count(*)::integer as count from events where name = $1", [data.name]);
    assert.equal(rolledBack.rows[0].count, 0);
  } finally {
    await pool.query("delete from events where creator_id = $1", [userId]);
    await pool.query("delete from organization_memberships where organization_id in ($1, $2)", [organizationId, otherOrganizationId]);
    await pool.query("delete from organizations where id in ($1, $2)", [organizationId, otherOrganizationId]);
    await pool.query("delete from users where id in ($1, $2, $3, $4, $5)", [userId, staffUserId, outsiderId, sponsorId, inactiveOrganizerId]);
    await pool.end();
    if (previousRuntimeUrl) process.env.DATABASE_URL = previousRuntimeUrl; else delete process.env.DATABASE_URL;
  }
});
