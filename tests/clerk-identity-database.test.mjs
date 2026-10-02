import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";

const enabled = process.env.WEFT_DATABASE_TEST === "1" && Boolean(process.env.DATABASE_TEST_URL);

test("Clerk identity constraints, disabled lookup, instance scope, and rollback", { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_TEST_URL, ssl: { rejectUnauthorized: true }, max: 3 });
  const client = await pool.connect();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const instanceId = `test_${randomUUID()}`;
  const subject = `user_${randomUUID().replaceAll("-", "")}`;
  try {
    const target = await client.query("select current_database() as db");
    assert.equal(target.rows[0]?.db, "weft_console_test", "database cases are restricted to the development test database");
    await client.query("BEGIN");
    await client.query("INSERT INTO users (id, display_name) VALUES ($1, 'Identity test'), ($2, 'Identity test two')", [userId, otherUserId]);
    const first = await client.query(
      "INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3) RETURNING id",
      [userId, instanceId, subject],
    );
    await client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject, disabled_at) VALUES ($1, 'clerk', $2, $3, now())", [otherUserId, `${instanceId}_disabled`, `${subject}_disabled`]);
    const disabled = await client.query("SELECT id FROM user_auth_identities WHERE instance_id = $1 AND subject = $2 AND disabled_at IS NULL", [`${instanceId}_disabled`, `${subject}_disabled`]);
    assert.equal(disabled.rowCount, 0);
    await client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [otherUserId, `${instanceId}_other`, subject]);

    await client.query("SAVEPOINT identity_conflict");
    await assert.rejects(client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [otherUserId, instanceId, subject]), (error) => error.code === "23505");
    await client.query("ROLLBACK TO SAVEPOINT identity_conflict");
    await client.query("SAVEPOINT user_conflict");
    await assert.rejects(client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [userId, instanceId, `${subject}_second`]), (error) => error.code === "23505");
    await client.query("ROLLBACK TO SAVEPOINT user_conflict");
    await client.query("SAVEPOINT foreign_key_conflict");
    await assert.rejects(client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [randomUUID(), instanceId, `${subject}_missing`]), (error) => error.code === "23503");
    await client.query("ROLLBACK TO SAVEPOINT foreign_key_conflict");
    assert.ok(first.rows[0].id);
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
});
