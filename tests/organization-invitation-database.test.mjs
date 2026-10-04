import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { loadTs } from "./load-ts.mjs";

const enabled = process.env.WEFT_DATABASE_TEST === "1" && Boolean(process.env.DATABASE_TEST_URL);

test("organization invitation transactions serialize duplicates and acceptance replay", { skip: !enabled }, async () => {
  const connectionString = process.env.DATABASE_TEST_URL;
  const url = new URL(connectionString);
  assert.equal(url.pathname.slice(1), "weft_console_test", "database cases are restricted to weft_console_test");
  assert.ok(url.hostname.endsWith("neon.tech"), "database cases require the development Neon test database");
  const setup = new Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 2 });
  const target = await setup.query("select current_database() as db");
  assert.equal(target.rows[0]?.db, "weft_console_test");

  process.env.DATABASE_URL = connectionString;
  const { reserveInvitation, findInvitation, saveOrganizationIdentity, commitAdmission, expireInvitation } = loadTs("src/modules/organizations/invitations/repository.ts");
  const { closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const ownerId = randomUUID();
  const existingUserId = randomUUID();
  const newOrgId = randomUUID();
  const secondOrgId = randomUUID();
  const otherOrgId = randomUUID();
  const instanceId = `test_${randomUUID()}`;
  const existingSubject = `user_${randomUUID().replaceAll("-", "")}`;
  let invitationIds = [];
  try {
    await setup.query("INSERT INTO users (id, display_name) VALUES ($1, 'Invitation owner'), ($2, 'Existing profile')", [ownerId, existingUserId]);
    await setup.query("INSERT INTO organizations (id, name) VALUES ($1, 'Invitation target'), ($2, 'Second target'), ($3, 'Existing access')", [newOrgId, secondOrgId, otherOrgId]);
    await setup.query("INSERT INTO organization_memberships (organization_id, user_id, role, active) VALUES ($1, $2, 'owner', true), ($3, $2, 'owner', true)", [newOrgId, ownerId, secondOrgId]);
    await setup.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [existingUserId, instanceId, existingSubject]);
    await setup.query("INSERT INTO organization_memberships (organization_id, user_id, role, active) VALUES ($1, $2, 'organizer', true)", [otherOrgId, existingUserId]);
    await saveOrganizationIdentity({ organizationId: newOrgId, instanceId, organizationSubject: "org_provider_one" });
    await saveOrganizationIdentity({ organizationId: secondOrgId, instanceId, organizationSubject: "org_provider_two" });

    const now = new Date(Date.now() - 1000);
    const [first, duplicate] = await Promise.all([
      reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "first@example.com", role: "owner", now }),
      reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "first@example.com", role: "organizer", now }),
    ]);
    assert.equal(first.invitation.id, duplicate.invitation.id);
    assert.equal(Number(first.created) + Number(duplicate.created), 1);
    assert.equal((await findInvitation(first.invitation.id, `${instanceId}_wrong`)), null);
    invitationIds.push(first.invitation.id);

    const firstChoice = await reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "preserve@example.com", role: "owner", now });
    const laterChoice = await reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "preserve@example.com", role: "organizer", now });
    assert.equal(laterChoice.created, false);
    assert.equal(laterChoice.invitation.role, "owner");
    invitationIds.push(firstChoice.invitation.id);

    const expiredAt = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    assert.ok(await expireInvitation(first.invitation.id, instanceId, expiredAt));
    const replacement = await reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "first@example.com", role: "organizer", now: expiredAt });
    invitationIds.push(replacement.invitation.id);
    assert.equal(replacement.created, true);
    const old = await findInvitation(first.invitation.id, instanceId);
    assert.equal(old.status, "expired");

    const existingInvitation = await reserveInvitation({ organizationId: newOrgId, instanceId, inviterUserId: ownerId, email: "ada+team@example.com", role: "organizer", now });
    invitationIds.push(existingInvitation.invitation.id);
    const acceptedAt = new Date(Date.now() - 100);
    const existingEvidence = { subject: existingSubject, organizationSubject: "org_provider_one", membershipId: "mem_existing",
      correlationId: existingInvitation.invitation.id, acceptedAt, verifiedEmails: ["ada+team@example.com"], displayName: "Changed name", avatarUrl: "https://example.com/avatar.png" };
    const [admissionOne, admissionReplay] = await Promise.all([
      commitAdmission({ invitationId: existingInvitation.invitation.id, instanceId, evidence: existingEvidence }),
      commitAdmission({ invitationId: existingInvitation.invitation.id, instanceId, evidence: existingEvidence }),
    ]);
    assert.equal(admissionOne.kind, "complete");
    assert.deepEqual(admissionReplay, admissionOne);
    assert.equal(admissionOne.userId, existingUserId);
    const profile = await setup.query("SELECT display_name FROM users WHERE id = $1", [existingUserId]);
    assert.equal(profile.rows[0].display_name, "Existing profile");
    const preserved = await setup.query("SELECT role, active FROM organization_memberships WHERE organization_id = $1 AND user_id = $2", [otherOrgId, existingUserId]);
    assert.deepEqual(preserved.rows[0], { role: "organizer", active: true });

    const secondInvitation = await reserveInvitation({ organizationId: secondOrgId, instanceId, inviterUserId: ownerId, email: "ada+team@example.com", role: "owner", now });
    invitationIds.push(secondInvitation.invitation.id);
    const secondAdmission = await commitAdmission({ invitationId: secondInvitation.invitation.id, instanceId, evidence: {
      ...existingEvidence, organizationSubject: "org_provider_two", correlationId: secondInvitation.invitation.id,
    } });
    assert.equal(secondAdmission.userId, existingUserId);
    const memberships = await setup.query("SELECT organization_id, role FROM organization_memberships WHERE user_id = $1 ORDER BY organization_id", [existingUserId]);
    assert.equal(memberships.rowCount, 3);

    await setup.query("UPDATE organization_memberships SET active = false WHERE organization_id = $1 AND user_id = $2", [newOrgId, existingUserId]);
    const revokedReplay = await commitAdmission({ invitationId: existingInvitation.invitation.id, instanceId, evidence: existingEvidence });
    assert.deepEqual(revokedReplay, { kind: "conflict" });
    const revokedMembership = await setup.query("SELECT active FROM organization_memberships WHERE organization_id = $1 AND user_id = $2", [newOrgId, existingUserId]);
    assert.equal(revokedMembership.rows[0].active, false);

    const rollbackUser = randomUUID();
    const rollbackSubject = `user_${randomUUID().replaceAll("-", "")}`;
    const client = await setup.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO users (id, display_name) VALUES ($1, 'Rollback candidate')", [rollbackUser]);
      await client.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [rollbackUser, instanceId, rollbackSubject]);
      await assert.rejects(client.query("INSERT INTO organization_memberships (organization_id, user_id, role, active) VALUES ($1, $2, 'not_a_role', true)", [newOrgId, rollbackUser]));
      await client.query("ROLLBACK");
    } finally { client.release(); }
    const rolledBack = await setup.query("SELECT id FROM users WHERE id = $1", [rollbackUser]);
    assert.equal(rolledBack.rowCount, 0);
  } finally {
    if (invitationIds.length) await setup.query("DELETE FROM organization_invitations WHERE id = ANY($1::uuid[])", [invitationIds]);
    await setup.query("DELETE FROM organization_auth_identities WHERE organization_id = ANY($1::uuid[])", [[newOrgId, secondOrgId]]);
    await setup.query("DELETE FROM organization_memberships WHERE organization_id = ANY($1::uuid[])", [[newOrgId, secondOrgId, otherOrgId]]);
    await setup.query("DELETE FROM user_auth_identities WHERE user_id = ANY($1::uuid[])", [[ownerId, existingUserId]]);
    await setup.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [[ownerId, existingUserId]]);
    await setup.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [[newOrgId, secondOrgId, otherOrgId]]);
    await closeDatabase();
    await setup.end();
  }
});
