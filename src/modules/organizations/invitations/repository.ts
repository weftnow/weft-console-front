import "server-only";
import { and, asc, eq, gt, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationAuthIdentities, organizationInvitations } from "@/infrastructure/database/schema/organization-invitations";
import { organizationMemberships, organizations, userAuthIdentities, users } from "@/infrastructure/database/schema/identity";
import { ApplicationError } from "@/shared/lib/application-error";
import type { CompletionResult, DeliveryState, InvitationAdminActor, InvitationRecord, InvitationView, ProviderAcceptance } from "./types";

const recordFields = {
  id: organizationInvitations.id,
  organizationId: organizationInvitations.organizationId,
  instanceId: organizationInvitations.instanceId,
  email: organizationInvitations.email,
  role: organizationInvitations.role,
  inviterUserId: organizationInvitations.inviterUserId,
  providerInvitationId: organizationInvitations.providerInvitationId,
  status: organizationInvitations.status,
  deliveryState: organizationInvitations.deliveryState,
  deliveryLeaseUntil: organizationInvitations.deliveryLeaseUntil,
  deliveryErrorCode: organizationInvitations.deliveryErrorCode,
  providerCleanupPending: organizationInvitations.providerCleanupPending,
  createdAt: organizationInvitations.createdAt,
  expiresAt: organizationInvitations.expiresAt,
  acceptedAt: organizationInvitations.acceptedAt,
  acceptedSubject: organizationInvitations.acceptedSubject,
  acceptedUserId: organizationInvitations.acceptedUserId,
};

function view(row: InvitationRecord): InvitationView {
  const expired = row.status === "pending" && row.expiresAt.getTime() <= Date.now();
  return {
    id: row.id, email: row.email, role: row.role, status: expired ? "expired" : row.status,
    deliveryState: row.deliveryState, providerCleanupPending: row.providerCleanupPending,
    createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
  };
}

export async function listPreviousInvitationsForEmail(input: { organizationId: string; instanceId: string; email: string; now: Date }): Promise<InvitationRecord[]> {
  const rows = await getDatabase().select(recordFields).from(organizationInvitations).where(and(
    eq(organizationInvitations.organizationId, input.organizationId), eq(organizationInvitations.instanceId, input.instanceId),
    eq(organizationInvitations.email, input.email), or(eq(organizationInvitations.status, "expired"),
      and(eq(organizationInvitations.status, "pending"), lte(organizationInvitations.expiresAt, input.now))),
  ));
  return rows as InvitationRecord[];
}

export async function expireInvitation(id: string, instanceId: string, now: Date): Promise<InvitationRecord | null> {
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx.select(recordFields).from(organizationInvitations).where(and(
      eq(organizationInvitations.id, id), eq(organizationInvitations.instanceId, instanceId),
    )).for("update").limit(1);
    if (!row || row.status === "expired") return (row as InvitationRecord | undefined) ?? null;
    if (row.status !== "pending" || row.expiresAt > now) return null;
    const [expired] = await tx.update(organizationInvitations).set({ status: "expired" })
      .where(eq(organizationInvitations.id, id)).returning(recordFields);
    return (expired as InvitationRecord | undefined) ?? null;
  });
}

export async function findOrganizationIdentity(organizationId: string, instanceId: string): Promise<{ organizationSubject: string } | null> {
  const [row] = await getDatabase().select({ organizationSubject: organizationAuthIdentities.subject })
    .from(organizationAuthIdentities).where(and(
      eq(organizationAuthIdentities.organizationId, organizationId),
      eq(organizationAuthIdentities.instanceId, instanceId), eq(organizationAuthIdentities.provider, "clerk"),
    )).limit(1);
  return row ?? null;
}

export async function saveOrganizationIdentity(input: { organizationId: string; instanceId: string; organizationSubject: string }): Promise<void> {
  await getDatabase().transaction(async (tx) => {
    const [byLocal] = await tx.select().from(organizationAuthIdentities).where(and(
      eq(organizationAuthIdentities.organizationId, input.organizationId),
      eq(organizationAuthIdentities.instanceId, input.instanceId), eq(organizationAuthIdentities.provider, "clerk"),
    )).for("update").limit(1);
    const [byProvider] = await tx.select().from(organizationAuthIdentities).where(and(
      eq(organizationAuthIdentities.subject, input.organizationSubject),
      eq(organizationAuthIdentities.instanceId, input.instanceId), eq(organizationAuthIdentities.provider, "clerk"),
    )).for("update").limit(1);
    if (byLocal && byLocal.subject !== input.organizationSubject) throw new ApplicationError("CONFLICT", "Organization identity cannot be reassigned.");
    if (byProvider && byProvider.organizationId !== input.organizationId) throw new ApplicationError("CONFLICT", "Provider organization is already mapped.");
    if (!byLocal) await tx.insert(organizationAuthIdentities).values({
      organizationId: input.organizationId, instanceId: input.instanceId, subject: input.organizationSubject,
    });
  });
}

export async function requireActiveOwner(actor: InvitationAdminActor): Promise<void> {
  const [owner] = await getDatabase().select({ id: organizationMemberships.id }).from(organizationMemberships).where(and(
    eq(organizationMemberships.userId, actor.userId), eq(organizationMemberships.organizationId, actor.organizationId),
    eq(organizationMemberships.active, true), eq(organizationMemberships.role, "owner"),
  )).limit(1);
  if (!owner) throw new ApplicationError("FORBIDDEN", "An active organization owner is required.");
}

export async function findMemberByProviderIdentity(input: { subject: string; instanceId: string; organizationId: string }) {
  const [row] = await getDatabase().select({ role: organizationMemberships.role, active: organizationMemberships.active,
    disabledAt: userAuthIdentities.disabledAt })
    .from(userAuthIdentities).leftJoin(organizationMemberships, and(
      eq(organizationMemberships.userId, userAuthIdentities.userId), eq(organizationMemberships.organizationId, input.organizationId),
    )).where(and(eq(userAuthIdentities.provider, "clerk"), eq(userAuthIdentities.instanceId, input.instanceId),
      eq(userAuthIdentities.subject, input.subject))).limit(1);
  if (!row) return null;
  if (row.disabledAt) return { active: false, role: "disabled" };
  if (!row.role || row.active === null) return null;
  return { role: row.role, active: row.active };
}

export async function reserveInvitation(input: {
  organizationId: string; instanceId: string; inviterUserId: string; email: string; role: "owner" | "organizer"; now: Date;
}): Promise<{ invitation: InvitationRecord; created: boolean }> {
  return getDatabase().transaction(async (tx) => {
    const [owner] = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships).where(and(
      eq(organizationMemberships.userId, input.inviterUserId), eq(organizationMemberships.organizationId, input.organizationId),
      eq(organizationMemberships.active, true), eq(organizationMemberships.role, "owner"),
    )).for("update").limit(1);
    if (!owner) throw new ApplicationError("FORBIDDEN", "An active organization owner is required.");

    const [existing] = await tx.select(recordFields).from(organizationInvitations).where(and(
      eq(organizationInvitations.organizationId, input.organizationId), eq(organizationInvitations.instanceId, input.instanceId),
      eq(organizationInvitations.email, input.email), eq(organizationInvitations.status, "pending"),
    )).for("update").limit(1);
    if (existing) return { invitation: existing as InvitationRecord, created: false };

    const [inserted] = await tx.insert(organizationInvitations).values({
      organizationId: input.organizationId, instanceId: input.instanceId, email: input.email,
      role: input.role, inviterUserId: input.inviterUserId,
      createdAt: input.now, expiresAt: new Date(input.now.getTime() + 7 * 24 * 60 * 60 * 1000),
    }).returning(recordFields);
    return { invitation: inserted as InvitationRecord, created: true };
  });
}

export async function findInvitation(id: string, instanceId: string): Promise<InvitationRecord | null> {
  const [row] = await getDatabase().select(recordFields).from(organizationInvitations).where(and(
    eq(organizationInvitations.id, id), eq(organizationInvitations.instanceId, instanceId),
  )).limit(1);
  return (row as InvitationRecord | undefined) ?? null;
}

export async function listInvitationViews(organizationId: string, instanceId: string): Promise<InvitationView[]> {
  const rows = await getDatabase().select(recordFields).from(organizationInvitations).where(and(
    eq(organizationInvitations.organizationId, organizationId), eq(organizationInvitations.instanceId, instanceId),
  )).orderBy(asc(organizationInvitations.createdAt));
  return (rows as InvitationRecord[]).map(view);
}

export async function claimDelivery(id: string, now: Date): Promise<boolean> {
  const rows = await getDatabase().update(organizationInvitations).set({
    deliveryState: "sending", deliveryLeaseUntil: new Date(now.getTime() + 60_000), deliveryErrorCode: null,
  }).where(and(eq(organizationInvitations.id, id), eq(organizationInvitations.status, "pending"),
    or(eq(organizationInvitations.deliveryState, "queued"), eq(organizationInvitations.deliveryState, "failed"),
      eq(organizationInvitations.deliveryState, "unknown"), lt(organizationInvitations.deliveryLeaseUntil, now))))
    .returning({ id: organizationInvitations.id });
  return rows.length === 1;
}

export async function recordDelivery(id: string, result: { state: DeliveryState; providerInvitationId: string | null; errorCode: string | null }): Promise<void> {
  await getDatabase().update(organizationInvitations).set({
    deliveryState: result.state, providerInvitationId: result.providerInvitationId,
    deliveryErrorCode: result.errorCode, deliveryLeaseUntil: null,
  }).where(and(eq(organizationInvitations.id, id), eq(organizationInvitations.status, "pending")));
}

export async function revokePendingInvitation(actor: InvitationAdminActor, id: string, instanceId: string): Promise<InvitationRecord> {
  return getDatabase().transaction(async (tx) => {
    const [invitation] = await tx.select(recordFields).from(organizationInvitations).where(and(
      eq(organizationInvitations.id, id), eq(organizationInvitations.organizationId, actor.organizationId),
      eq(organizationInvitations.instanceId, instanceId),
    )).for("update").limit(1);
    if (!invitation) throw new ApplicationError("NOT_FOUND", "Invitation was not found.");
    const [owner] = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships).where(and(
      eq(organizationMemberships.userId, actor.userId), eq(organizationMemberships.organizationId, actor.organizationId),
      eq(organizationMemberships.active, true), eq(organizationMemberships.role, "owner"),
    )).for("update").limit(1);
    if (!owner) throw new ApplicationError("FORBIDDEN", "An active organization owner is required.");
    if (invitation.status === "accepted") throw new ApplicationError("CONFLICT", "Invitation was already accepted.");
    if (invitation.status !== "pending") return invitation as InvitationRecord;
    const [updated] = await tx.update(organizationInvitations).set({ status: "revoked" })
      .where(eq(organizationInvitations.id, id)).returning(recordFields);
    return updated as InvitationRecord;
  });
}

export async function markProviderCleanup(id: string, pending: boolean): Promise<void> {
  await getDatabase().update(organizationInvitations).set({ providerCleanupPending: pending }).where(eq(organizationInvitations.id, id));
}

export async function commitAdmission(input: { invitationId: string; instanceId: string; evidence: ProviderAcceptance }): Promise<CompletionResult> {
  return getDatabase().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.instanceId}:${input.evidence.subject}`}, 0))`);
    const [invitation] = await tx.select(recordFields).from(organizationInvitations).where(and(
      eq(organizationInvitations.id, input.invitationId), eq(organizationInvitations.instanceId, input.instanceId),
    )).for("update").limit(1);
    if (!invitation) return { kind: "unavailable" };
    if (!input.evidence.subject || input.evidence.correlationId !== invitation.id) return { kind: "conflict" };
    const mapped = await tx.select({ subject: organizationAuthIdentities.subject }).from(organizationAuthIdentities).where(and(
      eq(organizationAuthIdentities.organizationId, invitation.organizationId), eq(organizationAuthIdentities.instanceId, input.instanceId),
      eq(organizationAuthIdentities.provider, "clerk"), eq(organizationAuthIdentities.subject, input.evidence.organizationSubject),
    )).limit(1);
    if (!mapped.length) return { kind: "conflict" };
    if (invitation.email !== input.evidence.verifiedEmails.map((email) => email.trim().toLowerCase()).find((email) => email === invitation.email)) return { kind: "wrong-account" };
    if (invitation.status === "accepted") {
      if (invitation.acceptedSubject !== input.evidence.subject || !invitation.acceptedUserId) return { kind: "wrong-account" };
      const [identity] = await tx.select({ userId: userAuthIdentities.userId }).from(userAuthIdentities).where(and(
        eq(userAuthIdentities.provider, "clerk"), eq(userAuthIdentities.instanceId, input.instanceId),
        eq(userAuthIdentities.subject, input.evidence.subject), isNull(userAuthIdentities.disabledAt),
      )).limit(1);
      const [membership] = await tx.select({ active: organizationMemberships.active }).from(organizationMemberships).where(and(
        eq(organizationMemberships.organizationId, invitation.organizationId), eq(organizationMemberships.userId, invitation.acceptedUserId),
      )).limit(1);
      if (identity?.userId !== invitation.acceptedUserId || !membership?.active) return { kind: "conflict" };
      return { kind: "complete", userId: invitation.acceptedUserId, organizationId: invitation.organizationId };
    }
    if (invitation.status !== "pending") return { kind: "unavailable" };
    if (input.evidence.acceptedAt > invitation.expiresAt || input.evidence.acceptedAt < invitation.createdAt || input.evidence.acceptedAt > new Date()) return { kind: "unavailable" };
    const [owner] = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships).where(and(
      eq(organizationMemberships.userId, invitation.inviterUserId), eq(organizationMemberships.organizationId, invitation.organizationId),
      eq(organizationMemberships.active, true), eq(organizationMemberships.role, "owner"),
    )).for("update").limit(1);
    if (!owner) return { kind: "conflict" };

    let [identity] = await tx.select({ userId: userAuthIdentities.userId, disabledAt: userAuthIdentities.disabledAt }).from(userAuthIdentities).where(and(
      eq(userAuthIdentities.provider, "clerk"), eq(userAuthIdentities.instanceId, input.instanceId), eq(userAuthIdentities.subject, input.evidence.subject),
    )).for("update").limit(1);
    if (identity?.disabledAt) return { kind: "conflict" };
    let userId = identity?.userId;
    if (!userId) {
      const [created] = await tx.insert(users).values({
        displayName: input.evidence.displayName.trim().slice(0, 160) || invitation.email,
        avatarUrl: input.evidence.avatarUrl && new URL(input.evidence.avatarUrl).protocol === "https:" ? input.evidence.avatarUrl : null,
      }).returning({ id: users.id });
      userId = created.id;
      [identity] = await tx.insert(userAuthIdentities).values({
        userId, provider: "clerk", instanceId: input.instanceId, subject: input.evidence.subject,
      }).returning({ userId: userAuthIdentities.userId, disabledAt: userAuthIdentities.disabledAt });
    }
    const [membership] = await tx.select({ active: organizationMemberships.active }).from(organizationMemberships).where(and(
      eq(organizationMemberships.organizationId, invitation.organizationId), eq(organizationMemberships.userId, userId),
    )).for("update").limit(1);
    if (membership && !membership.active) return { kind: "conflict" };
    if (!membership) await tx.insert(organizationMemberships).values({
      organizationId: invitation.organizationId, userId, role: invitation.role as "owner" | "organizer", active: true,
    });
    await tx.update(organizationInvitations).set({
      status: "accepted", acceptedAt: input.evidence.acceptedAt, acceptedSubject: input.evidence.subject, acceptedUserId: userId,
    }).where(eq(organizationInvitations.id, invitation.id));
    return { kind: "complete", userId, organizationId: invitation.organizationId };
  });
}

export async function listInvitationCandidates(input: { instanceId: string; emails: string[] }) {
  const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()))];
  if (emails.length === 0) return [];
  return getDatabase().select({ invitationId: organizationInvitations.id, email: organizationInvitations.email,
    organizationId: organizationInvitations.organizationId, organizationName: organizations.name, organizationSubject: organizationAuthIdentities.subject })
    .from(organizationInvitations).innerJoin(organizations, eq(organizations.id, organizationInvitations.organizationId))
    .innerJoin(organizationAuthIdentities, and(eq(organizationAuthIdentities.organizationId, organizationInvitations.organizationId),
      eq(organizationAuthIdentities.instanceId, organizationInvitations.instanceId), eq(organizationAuthIdentities.provider, "clerk")))
    .where(and(eq(organizationInvitations.instanceId, input.instanceId), eq(organizationInvitations.status, "pending"),
      gt(organizationInvitations.expiresAt, new Date()), inArray(organizationInvitations.email, emails)));
}
