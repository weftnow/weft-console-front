import type { CustomerRequest } from "./validation";
import type { CustomerProvisioningRecord, OwnerInvitationRecord } from "./types";

export type ProvisioningResult = {
  requestId: string;
  organizationId: string | null;
  invitationId: string | null;
  status: "dry-run" | "pending" | "sent" | "unknown" | "failed" | "consumed" | "cancelled";
  providerOrganizationId: string | null;
  providerInvitationId: string | null;
  cleanupPending: boolean;
  errorCode: string | null;
};

type ProviderInvitation = { id: string; organizationSubject: string; correlationId: string | null; status: string };
type Provider = {
  findOrganization(localOrganizationId: string): Promise<{ id: string } | null>;
  createOrganization(input: { name: string; localOrganizationId: string }): Promise<{ id: string }>;
  findByCorrelation(organizationSubject: string, correlationId: string): Promise<ProviderInvitation | null>;
  send(input: { organizationSubject: string; email: string; correlationId: string; redirectUrl: string }): Promise<ProviderInvitation>;
  revoke(organizationSubject: string, invitationId: string): Promise<void>;
};
type Lease = { generation: number; expiresAt: Date } | null;
type Repository = {
  reserveCustomer(input: CustomerRequest, now: Date): Promise<{ provisioning: CustomerProvisioningRecord; invitation: OwnerInvitationRecord; created: boolean }>;
  findCustomer(requestId: string, instanceId: string): Promise<CustomerProvisioningRecord | null>;
  findLatestInvitation(requestId: string, instanceId: string): Promise<OwnerInvitationRecord | null>;
  findOrganizationIdentity(organizationId: string, instanceId: string): Promise<{ organizationSubject: string } | null>;
  saveOrganizationIdentity(input: { organizationId: string; instanceId: string; organizationSubject: string }): Promise<void>;
  saveProvisionedOrganizationIdentity?(input: { requestId: string; organizationId: string; instanceId: string; organizationSubject: string; generation: number }): Promise<boolean>;
  claimOrganizationTransport(requestId: string, now: Date): Promise<Lease>;
  recordOrganizationTransport(requestId: string, generation: number, state: "ready" | "unknown" | "failed", errorCode?: string | null): Promise<boolean>;
  claimOwnerDelivery(invitationId: string, now: Date): Promise<Lease>;
  recordOwnerDelivery(invitationId: string, generation: number, state: "sent" | "unknown" | "failed", providerInvitationId: string | null, errorCode?: string | null): Promise<boolean>;
  cancelCustomer(requestId: string, instanceId: string, now: Date): Promise<{ provisioning: CustomerProvisioningRecord; invitation: OwnerInvitationRecord | null }>;
  renewOwnerInvitation(requestId: string, instanceId: string, now: Date, providerInvitationId?: string | null): Promise<{ provisioning: CustomerProvisioningRecord; previousInvitation: OwnerInvitationRecord; invitation: OwnerInvitationRecord }>;
  markOwnerCleanup(invitationId: string, pending: boolean): Promise<void>;
  listOwnerCleanup(requestId: string, instanceId: string): Promise<OwnerInvitationRecord[]>;
};
type Dependencies = { repository: Repository; provider: Provider; appOrigin: string; now?: () => Date };

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { code: "provider_error", unknown: true };
  const candidate = "code" in error && typeof error.code === "string" ? error.code : "provider_error";
  const knownCodes = new Set(["provider_rate_limited", "provider_unavailable", "provider_timeout", "provider_rejected", "provider_error",
    "provider_ambiguous", "provider_correlation_missing", "organization_mapping_conflict", "provider_invitation_conflict",
    "provider_organization_not_found", "organization_lease_lost", "invitation_lease_lost", "owner_invitation_expired_requires_renewal"]);
  const code = knownCodes.has(candidate) ? candidate : "provider_error";
  const unknown = "outcomeUnknown" in error ? Boolean(error.outcomeUnknown) : true;
  return { code, unknown };
}

function result(provisioning: CustomerProvisioningRecord, invitation: OwnerInvitationRecord | null, providerOrganizationId: string | null, status?: ProvisioningResult["status"]): ProvisioningResult {
  const inferred = provisioning.status === "consumed" ? "consumed" : provisioning.status === "cancelled" ? "cancelled" :
    invitation?.deliveryState === "sent" ? "sent" : invitation?.deliveryState === "unknown" || provisioning.organizationTransportState === "unknown" ? "unknown" :
    invitation?.deliveryState === "failed" || provisioning.organizationTransportState === "failed" ? "failed" : "pending";
  return {
    requestId: provisioning.requestId, organizationId: provisioning.organizationId, invitationId: invitation?.id ?? null,
    status: status ?? inferred, providerOrganizationId, providerInvitationId: invitation?.providerInvitationId ?? null,
    cleanupPending: invitation?.providerCleanupPending ?? false,
    errorCode: invitation?.deliveryErrorCode ?? provisioning.organizationErrorCode,
  };
}

export function createCustomerProvisioningService(dependencies: Dependencies) {
  const now = dependencies.now ?? (() => new Date());

  async function clearProviderCleanup(provisioning: CustomerProvisioningRecord) {
    const cleanup = await dependencies.repository.listOwnerCleanup(provisioning.requestId, provisioning.instanceId);
    if (cleanup.length === 0) return { pending: false, errorCode: null as string | null };
    const mapping = await dependencies.repository.findOrganizationIdentity(provisioning.organizationId, provisioning.instanceId);
    if (!mapping) return { pending: true, errorCode: "provider_cleanup_pending" };
    for (const invitation of cleanup) {
      try {
        const found = await dependencies.provider.findByCorrelation(mapping.organizationSubject, invitation.id);
        if (found?.status === "accepted") return { pending: true, errorCode: "provider_invitation_accepted" };
        if (found?.status === "pending") await dependencies.provider.revoke(mapping.organizationSubject, found.id);
        if (!found && !invitation.providerInvitationId && (invitation.deliveryState === "sending" || invitation.deliveryState === "unknown")) {
          return { pending: true, errorCode: "provider_outcome_unknown" };
        }
        await dependencies.repository.markOwnerCleanup(invitation.id, false);
      } catch (error) {
        return { pending: true, errorCode: errorDetails(error).code };
      }
    }
    return { pending: false, errorCode: null };
  }

  async function provision(provisioning: CustomerProvisioningRecord, invitation: OwnerInvitationRecord): Promise<ProvisioningResult> {
    if (provisioning.status !== "pending" || invitation.status !== "pending") return result(provisioning, invitation, null);
    let mapping = await dependencies.repository.findOrganizationIdentity(provisioning.organizationId, provisioning.instanceId);
    let providerOrganization: { id: string } | null;
    try { providerOrganization = await dependencies.provider.findOrganization(provisioning.organizationId); }
    catch (error) {
      const details = errorDetails(error);
      const lease = provisioning.organizationTransportState === "ready" ? null :
        await dependencies.repository.claimOrganizationTransport(provisioning.requestId, now());
      if (lease) await dependencies.repository.recordOrganizationTransport(provisioning.requestId, lease.generation, details.unknown ? "unknown" : "failed", details.code);
      return { ...result(provisioning, invitation, mapping?.organizationSubject ?? null), status: details.unknown ? "unknown" : "failed", errorCode: details.code };
    }
    if (mapping && providerOrganization && mapping.organizationSubject !== providerOrganization.id) {
      return { ...result(provisioning, invitation, mapping.organizationSubject), status: "failed", errorCode: "organization_mapping_conflict" };
    }
    if (mapping && !providerOrganization) {
      return { ...result(provisioning, invitation, mapping.organizationSubject), status: "unknown", errorCode: "provider_organization_not_found" };
    }
    if (!providerOrganization && provisioning.organizationErrorCode === "provider_correlation_missing") {
      return { ...result(provisioning, invitation, null, "unknown"), errorCode: "provider_correlation_missing" };
    }
    const organizationLease = provisioning.organizationTransportState === "ready" && mapping ? null :
      await dependencies.repository.claimOrganizationTransport(provisioning.requestId, now());
    if (!organizationLease && !(provisioning.organizationTransportState === "ready" && mapping)) {
      return result(provisioning, invitation, mapping?.organizationSubject ?? providerOrganization?.id ?? null);
    }
    if (!providerOrganization) {
      try { providerOrganization = await dependencies.provider.createOrganization({ name: provisioning.organizationName, localOrganizationId: provisioning.organizationId }); }
      catch (error) {
        const details = errorDetails(error);
        if (organizationLease) await dependencies.repository.recordOrganizationTransport(provisioning.requestId, organizationLease.generation, details.unknown ? "unknown" : "failed", details.code);
        return { ...result(provisioning, invitation, null), status: details.unknown ? "unknown" : "failed", errorCode: details.code };
      }
    }
    try {
      if (mapping && mapping.organizationSubject !== providerOrganization.id) throw Object.assign(new Error(), { code: "organization_mapping_conflict", outcomeUnknown: false });
      if (organizationLease && dependencies.repository.saveProvisionedOrganizationIdentity) {
        const saved = await dependencies.repository.saveProvisionedOrganizationIdentity({ requestId: provisioning.requestId,
          organizationId: provisioning.organizationId, instanceId: provisioning.instanceId, organizationSubject: providerOrganization.id,
          generation: organizationLease.generation });
        if (!saved) return { ...result(provisioning, invitation, providerOrganization.id), status: "unknown", errorCode: "organization_lease_lost" };
        mapping = { organizationSubject: providerOrganization.id };
      } else {
        if (!mapping) {
          await dependencies.repository.saveOrganizationIdentity({ organizationId: provisioning.organizationId, instanceId: provisioning.instanceId, organizationSubject: providerOrganization.id });
          mapping = { organizationSubject: providerOrganization.id };
        }
        if (organizationLease && !(await dependencies.repository.recordOrganizationTransport(provisioning.requestId, organizationLease.generation, "ready", null))) {
          return { ...result(provisioning, invitation, providerOrganization.id), status: "unknown", errorCode: "organization_lease_lost" };
        }
      }
    } catch (error) {
      const details = errorDetails(error);
      if (organizationLease) await dependencies.repository.recordOrganizationTransport(provisioning.requestId, organizationLease.generation, "failed", details.code);
      return { ...result(provisioning, invitation, providerOrganization.id), status: "failed", errorCode: details.code };
    }

    let existingInvitation: ProviderInvitation | null;
    try { existingInvitation = await dependencies.provider.findByCorrelation(providerOrganization.id, invitation.id); }
    catch (error) {
      const details = errorDetails(error);
      const lease = await dependencies.repository.claimOwnerDelivery(invitation.id, now());
      if (lease) await dependencies.repository.recordOwnerDelivery(invitation.id, lease.generation, details.unknown ? "unknown" : "failed", null, details.code);
      return { ...result(provisioning, invitation, providerOrganization.id), status: details.unknown ? "unknown" : "failed", errorCode: details.code };
    }
    if (existingInvitation) {
      if (existingInvitation.organizationSubject !== providerOrganization.id || existingInvitation.correlationId !== invitation.id || !["pending", "accepted"].includes(existingInvitation.status)) {
        return { ...result(provisioning, invitation, providerOrganization.id), status: "failed", errorCode: "provider_invitation_conflict" };
      }
      const lease = await dependencies.repository.claimOwnerDelivery(invitation.id, now());
      if (!lease) return result(provisioning, invitation, providerOrganization.id);
      const recorded = await dependencies.repository.recordOwnerDelivery(invitation.id, lease.generation, "sent", existingInvitation.id, null);
      return { ...result(provisioning, invitation, providerOrganization.id, recorded ? "sent" : "unknown"),
        providerInvitationId: existingInvitation.id, errorCode: recorded ? null : "invitation_lease_lost" };
    }
    if (invitation.expiresAt.getTime() <= now().getTime()) {
      return { ...result(provisioning, invitation, providerOrganization.id, "failed"), errorCode: "owner_invitation_expired_requires_renewal" };
    }
    const deliveryLease = await dependencies.repository.claimOwnerDelivery(invitation.id, now());
    if (!deliveryLease) return result(provisioning, invitation, providerOrganization.id);
    const redirect = new URL("/accept-invitation", dependencies.appOrigin);
    redirect.searchParams.set("invitation", invitation.id);
    try {
      const sent = await dependencies.provider.send({ organizationSubject: providerOrganization.id, email: provisioning.ownerEmail,
        correlationId: invitation.id, redirectUrl: redirect.toString() });
      const recorded = await dependencies.repository.recordOwnerDelivery(invitation.id, deliveryLease.generation, "sent", sent.id, null);
      return { ...result(provisioning, invitation, providerOrganization.id, recorded ? "sent" : "unknown"), providerInvitationId: sent.id,
        errorCode: recorded ? null : "invitation_lease_lost" };
    } catch (error) {
      const details = errorDetails(error);
      await dependencies.repository.recordOwnerDelivery(invitation.id, deliveryLease.generation, details.unknown ? "unknown" : "failed", null, details.code);
      return { ...result(provisioning, invitation, providerOrganization.id, details.unknown ? "unknown" : "failed"), errorCode: details.code };
    }
  }

  return {
    async createCustomer(input: CustomerRequest, options: { apply: boolean; sendInvitation: boolean }): Promise<ProvisioningResult> {
      if (!options.apply) return { requestId: input.requestId, organizationId: null, invitationId: null, status: "dry-run", providerOrganizationId: null, providerInvitationId: null, cleanupPending: false, errorCode: null };
      if (!options.sendInvitation) throw new Error("Apply requires --send-invitation.");
      const reserved = await dependencies.repository.reserveCustomer(input, now());
      if (!reserved.created) {
        const mapping = await dependencies.repository.findOrganizationIdentity(reserved.provisioning.organizationId, reserved.provisioning.instanceId);
        return result(reserved.provisioning, reserved.invitation, mapping?.organizationSubject ?? null);
      }
      return provision(reserved.provisioning, reserved.invitation);
    },
    async retryCustomer(requestId: string, instanceId: string): Promise<ProvisioningResult> {
      const provisioning = await dependencies.repository.findCustomer(requestId, instanceId);
      if (!provisioning) throw new Error("Customer provisioning was not found.");
      const invitation = await dependencies.repository.findLatestInvitation(requestId, instanceId);
      if (!invitation) throw new Error("Owner invitation was not found.");
      const cleanup = await clearProviderCleanup(provisioning);
      if (cleanup.pending) return { ...result(provisioning, invitation, null, "failed"), cleanupPending: true, errorCode: cleanup.errorCode };
      return provision(provisioning, invitation);
    },
    async readCustomerStatus(requestId: string, instanceId: string): Promise<ProvisioningResult> {
      const provisioning = await dependencies.repository.findCustomer(requestId, instanceId);
      if (!provisioning) throw new Error("Customer provisioning was not found.");
      const invitation = await dependencies.repository.findLatestInvitation(requestId, instanceId);
      const mapping = await dependencies.repository.findOrganizationIdentity(provisioning.organizationId, instanceId);
      const cleanup = await dependencies.repository.listOwnerCleanup(requestId, instanceId);
      return { ...result(provisioning, invitation, mapping?.organizationSubject ?? null), cleanupPending: cleanup.length > 0,
        errorCode: cleanup.length > 0 ? "provider_cleanup_pending" : invitation?.deliveryErrorCode ?? provisioning.organizationErrorCode };
    },
    async cancelCustomer(requestId: string, instanceId: string): Promise<ProvisioningResult> {
      const closed = await dependencies.repository.cancelCustomer(requestId, instanceId, now());
      const invitation = closed.invitation;
      const cleanup = await clearProviderCleanup(closed.provisioning);
      const mapping = await dependencies.repository.findOrganizationIdentity(closed.provisioning.organizationId, instanceId);
      return { ...result(closed.provisioning, invitation, mapping?.organizationSubject ?? null, "cancelled"),
        cleanupPending: cleanup.pending, errorCode: cleanup.errorCode };
    },
    async renewOwnerInvitation(requestId: string, instanceId: string): Promise<ProvisioningResult> {
      const provisioning = await dependencies.repository.findCustomer(requestId, instanceId);
      if (!provisioning) throw new Error("Customer provisioning was not found.");
      if (provisioning.status !== "pending") throw new Error("Only pending customer provisioning can be renewed.");
      const current = await dependencies.repository.findLatestInvitation(requestId, instanceId);
      if (!current) throw new Error("Owner invitation was not found.");
      if (current.status !== "pending" || current.expiresAt.getTime() > now().getTime()) {
        throw new Error("Only an expired pending Owner invitation can be renewed.");
      }
      const cleanup = await clearProviderCleanup(provisioning);
      if (cleanup.pending) return { ...result(provisioning, current, null, "failed"), cleanupPending: true, errorCode: cleanup.errorCode };
      const mapping = await dependencies.repository.findOrganizationIdentity(provisioning.organizationId, instanceId);
      let prior: ProviderInvitation | null = null;
      if (mapping) prior = await dependencies.provider.findByCorrelation(mapping.organizationSubject, current.id);
      if (prior?.status === "accepted") return { ...result(provisioning, current, mapping?.organizationSubject ?? null, "sent"), providerInvitationId: prior.id };
      const renewed = await dependencies.repository.renewOwnerInvitation(requestId, instanceId, now(), prior?.id ?? current.providerInvitationId);
      const renewedCleanup = await clearProviderCleanup(renewed.provisioning);
      if (renewedCleanup.pending) return { ...result(renewed.provisioning, renewed.invitation, mapping?.organizationSubject ?? null, "failed"),
        cleanupPending: true, errorCode: renewedCleanup.errorCode };
      return provision(renewed.provisioning, renewed.invitation);
    },
  };
}
