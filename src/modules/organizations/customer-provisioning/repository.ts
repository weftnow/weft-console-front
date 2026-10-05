import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { WeftDatabase } from "../../../infrastructure/database/client";
import { customerOwnerInvitations, customerProvisionings } from "../../../infrastructure/database/schema/customer-provisioning.ts";
import { organizationMemberships, organizations, userAuthIdentities, users } from "../../../infrastructure/database/schema/identity.ts";
import { organizationAuthIdentities } from "../../../infrastructure/database/schema/organization-invitations.ts";
import type { CustomerRequest, CustomerProvisioningRecord, OwnerInvitationRecord, ReservedCustomer } from "./types";
import type { CompletionResult, ProviderAcceptance } from "../invitations/types";

class ProvisioningRepositoryError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ProvisioningRepositoryError";
  }
}

const provisioningFields = {
  requestId: customerProvisionings.requestId, organizationId: customerProvisionings.organizationId,
  instanceId: customerProvisionings.instanceId, organizationName: customerProvisionings.organizationName,
  ownerEmail: customerProvisionings.ownerEmail, intendedRole: customerProvisionings.intendedRole,
  operator: customerProvisionings.operator, status: customerProvisionings.status,
  organizationTransportState: customerProvisionings.organizationTransportState,
  organizationLeaseUntil: customerProvisionings.organizationLeaseUntil,
  organizationLeaseGeneration: customerProvisionings.organizationLeaseGeneration,
  organizationErrorCode: customerProvisionings.organizationErrorCode, createdAt: customerProvisionings.createdAt,
  consumedAt: customerProvisionings.consumedAt, consumedSubject: customerProvisionings.consumedSubject,
  consumedUserId: customerProvisionings.consumedUserId,
};
const invitationFields = {
  id: customerOwnerInvitations.id, requestId: customerOwnerInvitations.requestId,
  instanceId: customerOwnerInvitations.instanceId, providerInvitationId: customerOwnerInvitations.providerInvitationId,
  status: customerOwnerInvitations.status, deliveryState: customerOwnerInvitations.deliveryState,
  deliveryLeaseUntil: customerOwnerInvitations.deliveryLeaseUntil,
  deliveryLeaseGeneration: customerOwnerInvitations.deliveryLeaseGeneration,
  deliveryErrorCode: customerOwnerInvitations.deliveryErrorCode,
  providerCleanupPending: customerOwnerInvitations.providerCleanupPending,
  createdAt: customerOwnerInvitations.createdAt, expiresAt: customerOwnerInvitations.expiresAt,
  acceptedAt: customerOwnerInvitations.acceptedAt, acceptedSubject: customerOwnerInvitations.acceptedSubject,
  acceptedUserId: customerOwnerInvitations.acceptedUserId,
};

function provisioning(row: Record<string, unknown>): CustomerProvisioningRecord {
  return { ...row, intendedRole: "owner" } as CustomerProvisioningRecord;
}
function invitation(row: Record<string, unknown>): OwnerInvitationRecord {
  return row as OwnerInvitationRecord;
}

export function createCustomerProvisioningRepository(database: WeftDatabase) {
  return {
    async reserveCustomer(input: CustomerRequest, now: Date): Promise<ReservedCustomer> {
      return database.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`customer-provisioning:${input.requestId}`}, 0))`);
        const [existing] = await tx.select(provisioningFields).from(customerProvisionings)
          .where(eq(customerProvisionings.requestId, input.requestId)).for("update").limit(1);
        if (existing) {
          if (existing.instanceId !== input.instanceId || existing.organizationName !== input.organizationName ||
            existing.ownerEmail !== input.ownerEmail) {
            throw new ProvisioningRepositoryError("CONFLICT", "Request ID is already reserved with different immutable inputs.");
          }
          const [latest] = await tx.select(invitationFields).from(customerOwnerInvitations)
            .where(eq(customerOwnerInvitations.requestId, input.requestId))
            .orderBy(desc(customerOwnerInvitations.createdAt)).limit(1);
          if (!latest) throw new ProvisioningRepositoryError("CONFLICT", "Customer provisioning has no invitation record.");
          return { provisioning: provisioning(existing), invitation: invitation(latest), created: false };
        }
        const [organization] = await tx.insert(organizations).values({ name: input.organizationName }).returning({ id: organizations.id });
        const [parent] = await tx.insert(customerProvisionings).values({
          requestId: input.requestId, organizationId: organization.id, instanceId: input.instanceId,
          organizationName: input.organizationName, ownerEmail: input.ownerEmail, intendedRole: "owner", operator: input.operator,
          createdAt: now,
        }).returning(provisioningFields);
        const [child] = await tx.insert(customerOwnerInvitations).values({
          requestId: input.requestId, instanceId: input.instanceId, createdAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        }).returning(invitationFields);
        return { provisioning: provisioning(parent), invitation: invitation(child), created: true };
      });
    },
    async findCustomer(requestId: string, instanceId: string): Promise<CustomerProvisioningRecord | null> {
      const [row] = await database.select(provisioningFields).from(customerProvisionings).where(and(
        eq(customerProvisionings.requestId, requestId), eq(customerProvisionings.instanceId, instanceId),
      )).limit(1);
      return row ? provisioning(row) : null;
    },
    async findOwnerInvitation(invitationId: string, instanceId: string): Promise<OwnerInvitationRecord | null> {
      const [row] = await database.select(invitationFields).from(customerOwnerInvitations).where(and(
        eq(customerOwnerInvitations.id, invitationId), eq(customerOwnerInvitations.instanceId, instanceId),
      )).limit(1);
      return row ? invitation(row) : null;
    },
    async findLatestInvitation(requestId: string, instanceId: string): Promise<OwnerInvitationRecord | null> {
      const [row] = await database.select(invitationFields).from(customerOwnerInvitations).where(and(
        eq(customerOwnerInvitations.requestId, requestId), eq(customerOwnerInvitations.instanceId, instanceId),
      )).orderBy(desc(customerOwnerInvitations.createdAt)).limit(1);
      return row ? invitation(row) : null;
    },
    async findProvisioningForInvitation(invitationId: string, instanceId: string) {
      const [row] = await database.select({ provisioning: provisioningFields, invitation: invitationFields })
        .from(customerOwnerInvitations).innerJoin(customerProvisionings, eq(customerProvisionings.requestId, customerOwnerInvitations.requestId))
        .where(and(eq(customerOwnerInvitations.id, invitationId), eq(customerOwnerInvitations.instanceId, instanceId),
          eq(customerProvisionings.instanceId, instanceId))).limit(1);
      return row ? { provisioning: provisioning(row.provisioning), invitation: invitation(row.invitation) } : null;
    },
    async listOwnerInvitationCandidates(instanceId: string, emails: string[]) {
      const rows = await database.select({ invitationId: customerOwnerInvitations.id, email: customerProvisionings.ownerEmail,
        organizationId: customerProvisionings.organizationId, organizationName: customerProvisionings.organizationName,
        organizationSubject: organizationAuthIdentities.subject, createdAt: customerOwnerInvitations.createdAt,
        expiresAt: customerOwnerInvitations.expiresAt })
        .from(customerOwnerInvitations).innerJoin(customerProvisionings, eq(customerProvisionings.requestId, customerOwnerInvitations.requestId))
        .innerJoin(organizations, eq(organizations.id, customerProvisionings.organizationId))
        .innerJoin(organizationAuthIdentities, and(eq(organizationAuthIdentities.organizationId, customerProvisionings.organizationId),
          eq(organizationAuthIdentities.instanceId, instanceId), eq(organizationAuthIdentities.provider, "clerk")))
        .where(and(eq(customerOwnerInvitations.instanceId, instanceId), eq(customerOwnerInvitations.status, "pending"),
          eq(customerProvisionings.status, "pending"), emails.length ? sql`${customerProvisionings.ownerEmail} = any(${emails})` : sql`false`));
      return rows;
    },
    async commitInitialOwner(input: { instanceId: string; invitationId: string; evidence: ProviderAcceptance }): Promise<CompletionResult> {
      return database.transaction(async (tx) => {
        const [locator] = await tx.select({ requestId: customerOwnerInvitations.requestId }).from(customerOwnerInvitations).where(and(
          eq(customerOwnerInvitations.id, input.invitationId), eq(customerOwnerInvitations.instanceId, input.instanceId),
        )).limit(1);
        if (!locator) return { kind: "unavailable" };
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.instanceId}:${input.evidence.subject}`}, 0))`);
        const [parent] = await tx.select(provisioningFields).from(customerProvisionings).where(and(
          eq(customerProvisionings.requestId, locator.requestId), eq(customerProvisionings.instanceId, input.instanceId),
        )).for("update").limit(1);
        const [ownerInvitation] = await tx.select(invitationFields).from(customerOwnerInvitations).where(and(
          eq(customerOwnerInvitations.id, input.invitationId), eq(customerOwnerInvitations.requestId, locator.requestId),
          eq(customerOwnerInvitations.instanceId, input.instanceId),
        )).for("update").limit(1);
        if (!parent || !ownerInvitation) return { kind: "unavailable" };
        if (ownerInvitation.status === "accepted") {
          if (ownerInvitation.acceptedSubject !== input.evidence.subject) return { kind: "wrong-account" };
          if (parent.status !== "consumed" || parent.consumedSubject !== input.evidence.subject ||
            parent.consumedUserId !== ownerInvitation.acceptedUserId) return { kind: "conflict" };
          const [identity] = await tx.select({ userId: userAuthIdentities.userId }).from(userAuthIdentities).where(and(
            eq(userAuthIdentities.provider, "clerk"), eq(userAuthIdentities.instanceId, input.instanceId),
            eq(userAuthIdentities.subject, input.evidence.subject), isNull(userAuthIdentities.disabledAt),
          )).limit(1);
          const [membership] = await tx.select({ role: organizationMemberships.role, active: organizationMemberships.active }).from(organizationMemberships).where(and(
            eq(organizationMemberships.organizationId, parent.organizationId), eq(organizationMemberships.userId, parent.consumedUserId!),
          )).limit(1);
          if (identity?.userId !== parent.consumedUserId || membership?.role !== "owner" || !membership.active) return { kind: "conflict" };
          return { kind: "complete", userId: parent.consumedUserId!, organizationId: parent.organizationId };
        }
        if (parent.status !== "pending" || ownerInvitation.status !== "pending") return { kind: "unavailable" };
        if (!input.evidence.subject || input.evidence.correlationId !== ownerInvitation.id ||
          input.evidence.acceptedAt < ownerInvitation.createdAt || input.evidence.acceptedAt > ownerInvitation.expiresAt || input.evidence.acceptedAt > new Date()) return { kind: "unavailable" };
        const [mapped] = await tx.select({ subject: organizationAuthIdentities.subject }).from(organizationAuthIdentities).where(and(
          eq(organizationAuthIdentities.organizationId, parent.organizationId), eq(organizationAuthIdentities.instanceId, input.instanceId),
          eq(organizationAuthIdentities.provider, "clerk"), eq(organizationAuthIdentities.subject, input.evidence.organizationSubject),
        )).limit(1);
        if (!mapped) return { kind: "conflict" };
        const hasDesignatedEmail = input.evidence.verifiedEmails.some((email) => email.trim().toLowerCase() === parent.ownerEmail);
        if (!hasDesignatedEmail) return { kind: "wrong-account" };
        const [existingMember] = await tx.select({ userId: organizationMemberships.userId }).from(organizationMemberships).where(
          eq(organizationMemberships.organizationId, parent.organizationId)).for("update").limit(1);
        if (existingMember) return { kind: "conflict" };
        let [identity] = await tx.select({ userId: userAuthIdentities.userId, disabledAt: userAuthIdentities.disabledAt }).from(userAuthIdentities).where(and(
          eq(userAuthIdentities.provider, "clerk"), eq(userAuthIdentities.instanceId, input.instanceId),
          eq(userAuthIdentities.subject, input.evidence.subject),
        )).for("update").limit(1);
        if (identity?.disabledAt) return { kind: "conflict" };
        let userId = identity?.userId;
        if (!userId) {
          const [created] = await tx.insert(users).values({
            displayName: input.evidence.displayName.trim().slice(0, 160) || parent.ownerEmail,
            avatarUrl: input.evidence.avatarUrl && new URL(input.evidence.avatarUrl).protocol === "https:" ? input.evidence.avatarUrl : null,
          }).returning({ id: users.id });
          userId = created.id;
          [identity] = await tx.insert(userAuthIdentities).values({
            userId, provider: "clerk", instanceId: input.instanceId, subject: input.evidence.subject,
          }).returning({ userId: userAuthIdentities.userId, disabledAt: userAuthIdentities.disabledAt });
        }
        await tx.insert(organizationMemberships).values({ organizationId: parent.organizationId, userId, role: "owner", active: true });
        await tx.update(customerOwnerInvitations).set({ status: "accepted", acceptedAt: input.evidence.acceptedAt,
          acceptedSubject: input.evidence.subject, acceptedUserId: userId }).where(eq(customerOwnerInvitations.id, ownerInvitation.id));
        await tx.update(customerProvisionings).set({ status: "consumed", consumedAt: new Date(), consumedSubject: input.evidence.subject,
          consumedUserId: userId, organizationLeaseUntil: null, organizationLeaseGeneration: sql`${customerProvisionings.organizationLeaseGeneration} + 1` })
          .where(eq(customerProvisionings.requestId, parent.requestId));
        return { kind: "complete", userId, organizationId: parent.organizationId };
      });
    },
    async findOrganizationIdentity(organizationId: string, instanceId: string): Promise<{ organizationSubject: string } | null> {
      const [row] = await database.select({ organizationSubject: organizationAuthIdentities.subject }).from(organizationAuthIdentities).where(and(
        eq(organizationAuthIdentities.organizationId, organizationId), eq(organizationAuthIdentities.instanceId, instanceId),
        eq(organizationAuthIdentities.provider, "clerk"),
      )).limit(1);
      return row ?? null;
    },
    async saveOrganizationIdentity(input: { organizationId: string; instanceId: string; organizationSubject: string }): Promise<void> {
      await database.transaction(async (tx) => {
        const [byLocal] = await tx.select().from(organizationAuthIdentities).where(and(
          eq(organizationAuthIdentities.organizationId, input.organizationId), eq(organizationAuthIdentities.instanceId, input.instanceId),
          eq(organizationAuthIdentities.provider, "clerk"),
        )).for("update").limit(1);
        const [byProvider] = await tx.select().from(organizationAuthIdentities).where(and(
          eq(organizationAuthIdentities.subject, input.organizationSubject), eq(organizationAuthIdentities.instanceId, input.instanceId),
          eq(organizationAuthIdentities.provider, "clerk"),
        )).for("update").limit(1);
        if (byLocal && byLocal.subject !== input.organizationSubject) throw new ProvisioningRepositoryError("CONFLICT", "Organization identity cannot be reassigned.");
        if (byProvider && byProvider.organizationId !== input.organizationId) throw new ProvisioningRepositoryError("CONFLICT", "Provider organization is already mapped.");
        if (!byLocal) await tx.insert(organizationAuthIdentities).values({
          organizationId: input.organizationId, instanceId: input.instanceId, provider: "clerk", subject: input.organizationSubject,
        });
      });
    },
    async saveProvisionedOrganizationIdentity(input: { requestId: string; organizationId: string; instanceId: string; organizationSubject: string; generation: number }): Promise<boolean> {
      return database.transaction(async (tx) => {
        const [parent] = await tx.select({ status: customerProvisionings.status, generation: customerProvisionings.organizationLeaseGeneration,
          leaseUntil: customerProvisionings.organizationLeaseUntil }).from(customerProvisionings).where(and(
          eq(customerProvisionings.requestId, input.requestId), eq(customerProvisionings.organizationId, input.organizationId),
          eq(customerProvisionings.instanceId, input.instanceId),
        )).for("update").limit(1);
        if (!parent || parent.status !== "pending" || parent.generation !== input.generation || !parent.leaseUntil || parent.leaseUntil <= new Date()) return false;
        const [byLocal] = await tx.select().from(organizationAuthIdentities).where(and(
          eq(organizationAuthIdentities.organizationId, input.organizationId), eq(organizationAuthIdentities.instanceId, input.instanceId),
          eq(organizationAuthIdentities.provider, "clerk"),
        )).for("update").limit(1);
        const [byProvider] = await tx.select().from(organizationAuthIdentities).where(and(
          eq(organizationAuthIdentities.subject, input.organizationSubject), eq(organizationAuthIdentities.instanceId, input.instanceId),
          eq(organizationAuthIdentities.provider, "clerk"),
        )).for("update").limit(1);
        if (byLocal && byLocal.subject !== input.organizationSubject) throw new ProvisioningRepositoryError("CONFLICT", "Organization identity cannot be reassigned.");
        if (byProvider && byProvider.organizationId !== input.organizationId) throw new ProvisioningRepositoryError("CONFLICT", "Provider organization is already mapped.");
        if (!byLocal) await tx.insert(organizationAuthIdentities).values({
          organizationId: input.organizationId, instanceId: input.instanceId, provider: "clerk", subject: input.organizationSubject,
        });
        const updated = await tx.update(customerProvisionings).set({ organizationTransportState: "ready", organizationLeaseUntil: null,
          organizationErrorCode: null }).where(and(eq(customerProvisionings.requestId, input.requestId),
          eq(customerProvisionings.status, "pending"), eq(customerProvisionings.organizationLeaseGeneration, input.generation),
          gt(customerProvisionings.organizationLeaseUntil, new Date()))).returning({ requestId: customerProvisionings.requestId });
        if (updated.length !== 1) throw new ProvisioningRepositoryError("CONFLICT", "Organization provisioning lease was lost.");
        return true;
      });
    },
    async claimOrganizationTransport(requestId: string, now: Date): Promise<{ generation: number; expiresAt: Date } | null> {
      const expiresAt = new Date(now.getTime() + 60_000);
      const [row] = await database.update(customerProvisionings).set({
        organizationTransportState: "sending", organizationLeaseUntil: expiresAt,
        organizationLeaseGeneration: sql`${customerProvisionings.organizationLeaseGeneration} + 1`, organizationErrorCode: null,
      }).where(and(eq(customerProvisionings.requestId, requestId), eq(customerProvisionings.status, "pending"),
        or(eq(customerProvisionings.organizationTransportState, "queued"), eq(customerProvisionings.organizationTransportState, "failed"),
          eq(customerProvisionings.organizationTransportState, "unknown"), lt(customerProvisionings.organizationLeaseUntil, now))))
        .returning({ generation: customerProvisionings.organizationLeaseGeneration });
      return row ? { generation: row.generation, expiresAt } : null;
    },
    async recordOrganizationTransport(requestId: string, generation: number, state: "ready" | "unknown" | "failed", errorCode: string | null = null): Promise<boolean> {
      const rows = await database.update(customerProvisionings).set({
        organizationTransportState: state, organizationLeaseUntil: null, organizationErrorCode: errorCode,
      }).where(and(eq(customerProvisionings.requestId, requestId), eq(customerProvisionings.status, "pending"),
        eq(customerProvisionings.organizationLeaseGeneration, generation), gt(customerProvisionings.organizationLeaseUntil, new Date())))
        .returning({ requestId: customerProvisionings.requestId });
      return rows.length === 1;
    },
    async claimOwnerDelivery(invitationId: string, now: Date): Promise<{ generation: number; expiresAt: Date } | null> {
      const expiresAt = new Date(now.getTime() + 60_000);
      const [row] = await database.update(customerOwnerInvitations).set({
        deliveryState: "sending", deliveryLeaseUntil: expiresAt,
        deliveryLeaseGeneration: sql`${customerOwnerInvitations.deliveryLeaseGeneration} + 1`, deliveryErrorCode: null,
      }).where(and(eq(customerOwnerInvitations.id, invitationId), eq(customerOwnerInvitations.status, "pending"),
        or(eq(customerOwnerInvitations.deliveryState, "queued"), eq(customerOwnerInvitations.deliveryState, "failed"),
          eq(customerOwnerInvitations.deliveryState, "unknown"), lt(customerOwnerInvitations.deliveryLeaseUntil, now))))
        .returning({ generation: customerOwnerInvitations.deliveryLeaseGeneration });
      return row ? { generation: row.generation, expiresAt } : null;
    },
    async recordOwnerDelivery(invitationId: string, generation: number, state: "sent" | "unknown" | "failed", providerInvitationId: string | null, errorCode: string | null = null): Promise<boolean> {
      const rows = await database.update(customerOwnerInvitations).set({
        deliveryState: state, providerInvitationId, deliveryErrorCode: errorCode, deliveryLeaseUntil: null,
      }).where(and(eq(customerOwnerInvitations.id, invitationId), eq(customerOwnerInvitations.status, "pending"),
        eq(customerOwnerInvitations.deliveryLeaseGeneration, generation), gt(customerOwnerInvitations.deliveryLeaseUntil, new Date())))
        .returning({ id: customerOwnerInvitations.id });
      return rows.length === 1;
    },
    async cancelCustomer(requestId: string, instanceId: string, now: Date) {
      return database.transaction(async (tx) => {
        const [parent] = await tx.select(provisioningFields).from(customerProvisionings).where(and(
          eq(customerProvisionings.requestId, requestId), eq(customerProvisionings.instanceId, instanceId),
        )).for("update").limit(1);
        if (!parent) throw new ProvisioningRepositoryError("NOT_FOUND", "Customer provisioning was not found.");
        if (parent.status === "consumed") throw new ProvisioningRepositoryError("CONFLICT", "An accepted Owner grant cannot be cancelled.");
        const [current] = await tx.select(invitationFields).from(customerOwnerInvitations).where(and(
          eq(customerOwnerInvitations.requestId, requestId), eq(customerOwnerInvitations.instanceId, instanceId),
        )).orderBy(desc(customerOwnerInvitations.createdAt)).for("update").limit(1);
        if (parent.status === "cancelled") return { provisioning: provisioning(parent), invitation: current ? invitation(current) : null };
        const [cancelled] = await tx.update(customerProvisionings).set({ status: "cancelled", organizationLeaseUntil: null,
          organizationLeaseGeneration: sql`${customerProvisionings.organizationLeaseGeneration} + 1` })
          .where(eq(customerProvisionings.requestId, requestId)).returning(provisioningFields);
        let child = current;
        if (current?.status === "pending") {
          const [closed] = await tx.update(customerOwnerInvitations).set({ status: "revoked", deliveryLeaseUntil: null,
            deliveryLeaseGeneration: sql`${customerOwnerInvitations.deliveryLeaseGeneration} + 1`,
            providerCleanupPending: Boolean(current.providerInvitationId) || current.deliveryState === "sending" || current.deliveryState === "unknown" })
            .where(eq(customerOwnerInvitations.id, current.id)).returning(invitationFields);
          child = closed;
        }
        return { provisioning: provisioning(cancelled), invitation: child ? invitation(child) : null, cancelledAt: now };
      });
    },
    async renewOwnerInvitation(requestId: string, instanceId: string, now: Date, providerInvitationId?: string | null) {
      return database.transaction(async (tx) => {
        const [parent] = await tx.select(provisioningFields).from(customerProvisionings).where(and(
          eq(customerProvisionings.requestId, requestId), eq(customerProvisionings.instanceId, instanceId),
        )).for("update").limit(1);
        if (!parent) throw new ProvisioningRepositoryError("NOT_FOUND", "Customer provisioning was not found.");
        if (parent.status !== "pending") throw new ProvisioningRepositoryError("CONFLICT", "Only a pending customer provisioning can be renewed.");
        const [current] = await tx.select(invitationFields).from(customerOwnerInvitations).where(and(
          eq(customerOwnerInvitations.requestId, requestId), eq(customerOwnerInvitations.instanceId, instanceId),
        )).orderBy(desc(customerOwnerInvitations.createdAt)).for("update").limit(1);
        if (!current || current.status !== "pending" || current.expiresAt > now) throw new ProvisioningRepositoryError("CONFLICT", "Only an expired pending Owner invitation can be renewed.");
        const [closed] = await tx.update(customerOwnerInvitations).set({ status: "expired", deliveryLeaseUntil: null,
          providerInvitationId: providerInvitationId ?? current.providerInvitationId,
          deliveryLeaseGeneration: sql`${customerOwnerInvitations.deliveryLeaseGeneration} + 1`,
          providerCleanupPending: Boolean(providerInvitationId ?? current.providerInvitationId) || current.deliveryState === "sending" || current.deliveryState === "unknown" })
          .where(eq(customerOwnerInvitations.id, current.id)).returning(invitationFields);
        const [replacement] = await tx.insert(customerOwnerInvitations).values({ requestId, instanceId,
          createdAt: now, expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }).returning(invitationFields);
        return { provisioning: provisioning(parent), previousInvitation: invitation(closed), invitation: invitation(replacement) };
      });
    },
    async markOwnerCleanup(invitationId: string, pending: boolean) {
      await database.update(customerOwnerInvitations).set({ providerCleanupPending: pending }).where(eq(customerOwnerInvitations.id, invitationId));
    },
    async listOwnerCleanup(requestId: string, instanceId: string) {
      const rows = await database.select(invitationFields).from(customerOwnerInvitations).where(and(
        eq(customerOwnerInvitations.requestId, requestId), eq(customerOwnerInvitations.instanceId, instanceId),
        eq(customerOwnerInvitations.providerCleanupPending, true),
      ));
      return rows.map(invitation);
    },
  };
}
