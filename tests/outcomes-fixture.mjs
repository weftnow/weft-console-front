import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { loadTs } from "./load-ts.mjs";

export const outcomesDatabaseEnabled = process.env.WEFT_DATABASE_TEST === "1";

export async function createOutcomesFixture(t) {
  assert.ok(outcomesDatabaseEnabled && process.env.DATABASE_TEST_URL, "Enable the database gate and set DATABASE_TEST_URL");
  assert.ok(URL.canParse(process.env.DATABASE_TEST_URL), "DATABASE_TEST_URL must be a valid URL");
  const url = new URL(process.env.DATABASE_TEST_URL);
  assert.ok(
    ["postgres:", "postgresql:"].includes(url.protocol) &&
      ["127.0.0.1", "localhost"].includes(url.hostname) &&
      url.pathname === "/weft_outcomes_scratch" && !url.search,
    "Outcomes tests require a migrated loopback weft_outcomes_scratch database without connection options",
  );
  const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const previousEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    WEFT_ENGINE_MODE: process.env.WEFT_ENGINE_MODE,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  const [organizationId, foreignOrgId, eventId, untrackedId, foreignEventId] = Array.from({ length: 5 }, randomUUID);
  const userIds = Object.fromEntries(["owner", "organizer", "staff", "sponsor", "inactive", "outsider", "foreignOwner"]
    .map((role) => [role, randomUUID()]));
  const eventIds = [eventId, untrackedId, foreignEventId];
  let setupStarted = false;
  t.after(async () => {
    try {
      if (setupStarted) {
        await pool.query("delete from event_guests where event_id = any($1::uuid[])", [eventIds]);
        await pool.query("delete from events where id = any($1::uuid[])", [eventIds]);
        await pool.query("delete from organization_memberships where organization_id in ($1,$2)", [organizationId, foreignOrgId]);
        await pool.query("delete from organizations where id in ($1,$2)", [organizationId, foreignOrgId]);
        await pool.query("delete from users where id = any($1::uuid[])", [Object.values(userIds)]);
      }
    } finally {
      await closeDatabase();
      await pool.end();
      for (const [name, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  assert.equal((await pool.query("select current_database() as db")).rows[0].db, "weft_outcomes_scratch");
  process.env.DATABASE_URL = url.toString();
  process.env.WEFT_ENGINE_MODE = "engine";
  process.env.VERCEL_ENV = "development";
  setupStarted = true;
  await pool.query("insert into organizations (id, name) values ($1,'Outcomes fixture'),($2,'Different organization')", [organizationId, foreignOrgId]);
  for (const [role, userId] of Object.entries(userIds)) {
    await pool.query("insert into users (id, display_name) values ($1,$2)", [userId, role]);
    if (role === "outsider") continue;
    const org = role === "foreignOwner" ? foreignOrgId : organizationId;
    const localRole = role === "foreignOwner" || role === "inactive" ? "owner" : role;
    await pool.query("insert into organization_memberships (user_id, organization_id, role, active) values ($1,$2,$3,$4)",
      [userId, org, localRole, role !== "inactive"]);
  }
  for (const [id, org, name, day, creator] of [
    [eventId, organizationId, "Tracked event", "18", userIds.owner],
    [untrackedId, organizationId, "Untracked event", "19", userIds.owner],
    [foreignEventId, foreignOrgId, "Foreign event", "20", userIds.foreignOwner],
  ]) {
    const date = `2026-11-${day}`;
    await pool.query(`insert into events
      (id, organization_id, creator_id, name, description, city, categories, start_date, end_date, timezone, starts_at, ends_at)
      values ($1,$2,$3,$4,'Disposable fixture','Singapore',ARRAY['Technology'],$5,$5,'Asia/Singapore',$6,$7)`,
    [id, org, creator, name, date, `${date}T01:00:00Z`, `${date}T08:00:00Z`]);
  }

  async function addGuest(id, position) {
    const guest = { id: randomUUID(), personId: randomUUID() };
    await pool.query("insert into event_people (id, event_id) values ($1,$2)", [guest.personId, id]);
    await pool.query(`insert into event_guests (id, event_id, position, first_name, last_name, email, phone,
      company, job_position, profile_type, linkedin, guest_type, source, person_id)
      values ($1,$2,$3,'Fixture','Guest','','','','','','','Attendee','manual',$4)`, [guest.id, id, position, guest.personId]);
    return guest;
  }

  async function addMatch(id, a, b, recommendationId = randomUUID()) {
    const matchId = randomUUID();
    const [low, high] = [a.id, b.id].sort();
    await pool.query(`insert into event_matches (id, event_id, guest_low_id, guest_high_id, engine_recommendation_id,
      profile_version_low, profile_version_high, score_low, score_high, pair_score, benefits, shareable_reasons,
      missing_information, evidence, uncertainty, introduction_path)
      values ($1,$2,$3,$4,$5,0,0,1,1,1,'{}','{}','{}','[]','','sms_coordination')`, [matchId, id, low, high, recommendationId]);
    return matchId;
  }

  return { pool, userIds, organizationId, foreignOrgId, eventId, untrackedId, foreignEventId, addGuest, addMatch };
}
