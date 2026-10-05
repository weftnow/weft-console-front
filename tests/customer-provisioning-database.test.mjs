import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { loadTs } from "./load-ts.mjs";

const enabled = process.env.WEFT_DATABASE_TEST === "1" && Boolean(process.env.DATABASE_TEST_URL);

test("customer reservation is atomic and idempotent without creating an identity or membership", { skip: !enabled }, async () => {
  const connectionString = process.env.DATABASE_TEST_URL;
  const url = new URL(connectionString);
  assert.equal(url.pathname.slice(1), "weft_console_test", "database cases are restricted to weft_console_test");
  assert.ok(url.hostname.endsWith("neon.tech"), "database cases require the development Neon test database");
  const setup = new Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 2 });
  const target = await setup.query("select current_database() as db");
  assert.equal(target.rows[0]?.db, "weft_console_test");
  process.env.DATABASE_URL = connectionString;
  const { createCustomerProvisioningRepository } = loadTs("src/modules/organizations/customer-provisioning/repository.ts");
  const { getDatabase, closeDatabase } = loadTs("src/infrastructure/database/client.ts");
  const repository = createCustomerProvisioningRepository(getDatabase());
  const requestId = randomUUID();
  const sameNameRequestId = randomUUID();
  const existingUserId = randomUUID();
  const existingOtherOrgId = randomUUID();
  const requestIds = [requestId, sameNameRequestId];
  const now = new Date();
  const input = { requestId, organizationName: "Customer Provisioning Test", ownerEmail: "ada+bootstrap@example.com", instanceId: `test_${randomUUID()}`, operator: "automated-test" };
  let organizationIds = [];
  const provisionedUserIds = [];
  try {
    const [first, replay] = await Promise.all([
      repository.reserveCustomer(input, now), repository.reserveCustomer(input, now),
    ]);
    assert.equal(first.provisioning.organizationId, replay.provisioning.organizationId);
    assert.equal(first.invitation.id, replay.invitation.id);
    assert.equal(Number(first.created) + Number(replay.created), 1);
    assert.equal(first.provisioning.intendedRole, "owner");
    assert.equal(first.provisioning.status, "pending");
    assert.equal(first.invitation.status, "pending");
    assert.equal(first.invitation.expiresAt.getTime() - now.getTime(), 7 * 24 * 60 * 60 * 1000);
    organizationIds.push(first.provisioning.organizationId);
    await assert.rejects(repository.reserveCustomer({ ...input, ownerEmail: "different@example.com" }, now), /different immutable inputs/i);
    const sameName = await repository.reserveCustomer({ ...input, requestId: sameNameRequestId }, now);
    organizationIds.push(sameName.provisioning.organizationId);
    assert.notEqual(sameName.provisioning.organizationId, first.provisioning.organizationId);
    const counts = await setup.query(`
      SELECT (SELECT count(*) FROM user_auth_identities WHERE instance_id = $1) AS identities,
             (SELECT count(*) FROM organization_memberships WHERE organization_id = ANY($2::uuid[])) AS memberships
    `, [input.instanceId, organizationIds]);
    assert.equal(Number(counts.rows[0].identities), 0);
    assert.equal(Number(counts.rows[0].memberships), 0);

    await repository.saveOrganizationIdentity({ organizationId: first.provisioning.organizationId, instanceId: input.instanceId, organizationSubject: "provider_org_bootstrap_test" });
    const evidence = { subject: `user_${randomUUID().replaceAll("-", "")}`, organizationSubject: "provider_org_bootstrap_test",
      membershipId: "provider_membership", correlationId: first.invitation.id, acceptedAt: new Date(Date.now() - 100),
      verifiedEmails: [input.ownerEmail], displayName: "Ada Owner", avatarUrl: null, clerkRole: "org:admin" };
    const [firstCompletion, racedReplay] = await Promise.all([
      repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: first.invitation.id, evidence }),
      repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: first.invitation.id, evidence }),
    ]);
    assert.equal(firstCompletion.kind, "complete");
    assert.deepEqual(racedReplay, firstCompletion);
    provisionedUserIds.push(firstCompletion.userId);
    const ownerMemberships = await setup.query("SELECT role, active FROM organization_memberships WHERE organization_id = $1 AND user_id = $2", [first.provisioning.organizationId, firstCompletion.userId]);
    assert.deepEqual(ownerMemberships.rows[0], { role: "owner", active: true });
    const wrongSubject = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: first.invitation.id,
      evidence: { ...evidence, subject: "different_subject" } });
    assert.deepEqual(wrongSubject, { kind: "wrong-account" });
    await setup.query("UPDATE organization_memberships SET role = 'organizer' WHERE organization_id = $1 AND user_id = $2", [first.provisioning.organizationId, firstCompletion.userId]);
    assert.deepEqual(await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: first.invitation.id, evidence }), { kind: "conflict" });
    await setup.query("UPDATE organization_memberships SET active = false WHERE organization_id = $1 AND user_id = $2", [first.provisioning.organizationId, firstCompletion.userId]);
    assert.deepEqual(await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: first.invitation.id, evidence }), { kind: "conflict" });
    const unchanged = await setup.query("SELECT role, active FROM organization_memberships WHERE organization_id = $1 AND user_id = $2", [first.provisioning.organizationId, firstCompletion.userId]);
    assert.deepEqual(unchanged.rows[0], { role: "organizer", active: false });

    const existingSubject = `user_${randomUUID().replaceAll("-", "")}`;
    await setup.query("INSERT INTO users (id, display_name) VALUES ($1, 'Existing Account Profile')", [existingUserId]);
    await setup.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)", [existingUserId, input.instanceId, existingSubject]);
    await setup.query("INSERT INTO organizations (id, name) VALUES ($1, 'Existing Account Other Org')", [existingOtherOrgId]);
    organizationIds.push(existingOtherOrgId);
    await setup.query("INSERT INTO organization_memberships (organization_id, user_id, role, active) VALUES ($1, $2, 'organizer', true)", [existingOtherOrgId, existingUserId]);
    await repository.saveOrganizationIdentity({ organizationId: sameName.provisioning.organizationId, instanceId: input.instanceId, organizationSubject: "provider_org_existing_test" });
    const existingAccount = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: sameName.invitation.id, evidence: {
      subject: existingSubject, organizationSubject: "provider_org_existing_test", membershipId: "existing_provider_membership",
      correlationId: sameName.invitation.id, acceptedAt: new Date(Date.now() - 100), verifiedEmails: [input.ownerEmail],
      displayName: "Should Not Replace Profile", avatarUrl: "https://example.com/new-avatar.png",
    } });
    assert.equal(existingAccount.kind, "complete");
    assert.equal(existingAccount.userId, existingUserId);
    const profile = await setup.query("SELECT display_name FROM users WHERE id = $1", [existingUserId]);
    assert.equal(profile.rows[0].display_name, "Existing Account Profile");
    const preservedOtherMembership = await setup.query("SELECT role, active FROM organization_memberships WHERE organization_id = $1 AND user_id = $2", [existingOtherOrgId, existingUserId]);
    assert.deepEqual(preservedOtherMembership.rows[0], { role: "organizer", active: true });

    const disabledRequestId = randomUUID();
    requestIds.push(disabledRequestId);
    const disabled = await repository.reserveCustomer({ ...input, requestId: disabledRequestId, organizationName: "Disabled Mapping Test" }, now);
    organizationIds.push(disabled.provisioning.organizationId);
    const disabledSubject = `user_${randomUUID().replaceAll("-", "")}`;
    await setup.query("INSERT INTO user_auth_identities (user_id, provider, instance_id, subject, disabled_at) VALUES ($1, 'clerk', $2, $3, now())", [existingUserId, input.instanceId, disabledSubject]);
    await repository.saveOrganizationIdentity({ organizationId: disabled.provisioning.organizationId, instanceId: input.instanceId, organizationSubject: "provider_org_disabled_test" });
    const disabledResult = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: disabled.invitation.id, evidence: {
      subject: disabledSubject, organizationSubject: "provider_org_disabled_test", membershipId: "disabled_membership",
      correlationId: disabled.invitation.id, acceptedAt: new Date(Date.now() - 100), verifiedEmails: [input.ownerEmail], displayName: "Disabled", avatarUrl: null,
    } });
    assert.deepEqual(disabledResult, { kind: "conflict" });

    const occupiedRequestId = randomUUID();
    requestIds.push(occupiedRequestId);
    const occupied = await repository.reserveCustomer({ ...input, requestId: occupiedRequestId, organizationName: "Preexisting Member Test" }, now);
    organizationIds.push(occupied.provisioning.organizationId);
    const occupantId = randomUUID();
    provisionedUserIds.push(occupantId);
    await setup.query("INSERT INTO users (id, display_name) VALUES ($1, 'Existing Customer Member')", [occupantId]);
    await setup.query("INSERT INTO organization_memberships (organization_id, user_id, role, active) VALUES ($1, $2, 'organizer', true)", [occupied.provisioning.organizationId, occupantId]);
    await repository.saveOrganizationIdentity({ organizationId: occupied.provisioning.organizationId, instanceId: input.instanceId, organizationSubject: "provider_org_occupied_test" });
    const unknownOccupantSubject = `user_${randomUUID().replaceAll("-", "")}`;
    const occupiedResult = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: occupied.invitation.id, evidence: {
      subject: unknownOccupantSubject, organizationSubject: "provider_org_occupied_test", membershipId: "occupied_membership",
      correlationId: occupied.invitation.id, acceptedAt: new Date(Date.now() - 100), verifiedEmails: [input.ownerEmail], displayName: "Must Not Create", avatarUrl: null,
    } });
    assert.deepEqual(occupiedResult, { kind: "conflict" });
    const unknownIdentity = await setup.query("SELECT user_id FROM user_auth_identities WHERE instance_id = $1 AND subject = $2", [input.instanceId, unknownOccupantSubject]);
    assert.equal(unknownIdentity.rowCount, 0);

    const cancelledRequestId = randomUUID();
    requestIds.push(cancelledRequestId);
    const cancelled = await repository.reserveCustomer({ ...input, requestId: cancelledRequestId, organizationName: "Cancelled Test" }, now);
    organizationIds.push(cancelled.provisioning.organizationId);
    await repository.cancelCustomer(cancelledRequestId, input.instanceId, new Date());
    const cancelledResult = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: cancelled.invitation.id, evidence: {
      subject: "late_cancelled_subject", organizationSubject: "unmapped", membershipId: "late", correlationId: cancelled.invitation.id,
      acceptedAt: new Date(Date.now() - 100), verifiedEmails: [input.ownerEmail], displayName: "Late", avatarUrl: null,
    } });
    assert.deepEqual(cancelledResult, { kind: "unavailable" });

    const expiredRequestId = randomUUID();
    requestIds.push(expiredRequestId);
    const expired = await repository.reserveCustomer({ ...input, requestId: expiredRequestId, organizationName: "Expired Acceptance Test" }, now);
    organizationIds.push(expired.provisioning.organizationId);
    await repository.saveOrganizationIdentity({ organizationId: expired.provisioning.organizationId, instanceId: input.instanceId, organizationSubject: "provider_org_expired_test" });
    const expiredResult = await repository.commitInitialOwner({ instanceId: input.instanceId, invitationId: expired.invitation.id, evidence: {
      subject: "late_expired_subject", organizationSubject: "provider_org_expired_test", membershipId: "late", correlationId: expired.invitation.id,
      acceptedAt: new Date(expired.invitation.expiresAt.getTime() + 1000), verifiedEmails: [input.ownerEmail], displayName: "Late", avatarUrl: null,
    } });
    assert.deepEqual(expiredResult, { kind: "unavailable" });
  } finally {
    const relatedUsers = await setup.query("SELECT DISTINCT user_id FROM organization_memberships WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
    const userIds = [...new Set([...relatedUsers.rows.map((row) => row.user_id), ...provisionedUserIds])];
    await setup.query("DELETE FROM customer_owner_invitations WHERE request_id = ANY($1::uuid[])", [requestIds]);
    await setup.query("DELETE FROM customer_provisionings WHERE request_id = ANY($1::uuid[])", [requestIds]);
    if (organizationIds.length) {
      await setup.query("DELETE FROM organization_auth_identities WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
      await setup.query("DELETE FROM organization_memberships WHERE organization_id = ANY($1::uuid[])", [organizationIds]);
    }
    await setup.query("DELETE FROM user_auth_identities WHERE instance_id = $1", [input.instanceId]);
    if (userIds.length) await setup.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
    if (organizationIds.length) await setup.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [organizationIds]);
    await closeDatabase();
    await setup.end();
  }
});
