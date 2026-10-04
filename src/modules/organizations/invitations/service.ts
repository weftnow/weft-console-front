import { ApplicationError } from "@/shared/lib/application-error";
import { parseInvitationInput } from "./validation";
import type { DeliveryState, InvitationAdminActor, InvitationRecord, InvitationView, ProviderInvitation } from "./types";
import * as repository from "./repository";
import { getInvitationProvider } from "./clerk-provider";

type Provider = {
  send(input: { organizationSubject: string; email: string; correlationId: string; redirectUrl: string }): Promise<ProviderInvitation>;
  findByCorrelation(organizationSubject: string, correlationId: string): Promise<ProviderInvitation | null>;
  revoke(organizationSubject: string, invitationId: string): Promise<void>;
  findSubjectByVerifiedEmail(email: string): Promise<string | null>;
};
type ServiceDependencies = typeof repository & {
  provider?: Provider;
  now?: () => Date;
  instanceId?: string;
  appOrigin?: string;
  authorizeOwner?: (actor: InvitationAdminActor) => Promise<void>;
  findActiveMemberByEmail?: (input: { organizationId: string; instanceId: string; email: string }) => Promise<{ active: boolean; role: string } | null>;
};

const defaultDependencies: ServiceDependencies = {
  ...repository,
  provider: undefined,
  now: () => new Date(),
  instanceId: process.env.WEFT_CLERK_INSTANCE_ID,
  appOrigin: process.env.WEFT_APP_ORIGIN,
  authorizeOwner: repository.requireActiveOwner,
  findActiveMemberByEmail: async ({ organizationId, instanceId, email }) => {
    const subject = await (await getInvitationProvider()).findSubjectByVerifiedEmail(email);
    if (!subject) return null;
    return repository.findMemberByProviderIdentity({ subject, organizationId, instanceId });
  },
};

async function provider(deps: ServiceDependencies): Promise<Provider> {
  return deps.provider ?? getInvitationProvider();
}

function scoped(deps: ServiceDependencies) {
  const instanceId = deps.instanceId?.trim();
  if (!instanceId) throw new Error("WEFT_CLERK_INSTANCE_ID is required.");
  const origin = deps.appOrigin?.trim();
  if (!origin) throw new Error("WEFT_APP_ORIGIN is required.");
  const url = new URL(origin);
  if (url.origin !== origin || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("WEFT_APP_ORIGIN must be a canonical HTTPS origin.");
  }
  return { instanceId, origin: url.origin };
}

function asView(row: InvitationRecord): InvitationView {
  const expired = row.status === "pending" && row.expiresAt.getTime() <= Date.now();
  return {
    id: row.id, email: row.email, role: row.role, status: expired ? "expired" : row.status,
    deliveryState: row.deliveryState, providerCleanupPending: row.providerCleanupPending,
    createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
  };
}

function safeErrorCode(error: unknown): { code: string; state: DeliveryState } {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "provider_error";
  const known = ["provider_timeout", "provider_rate_limited", "provider_unavailable", "provider_rejected", "provider_error"];
  const sanitized = known.includes(code) ? code : code === "timeout" ? "provider_timeout" : "provider_error";
  const unknown = error && typeof error === "object" && "outcomeUnknown" in error && error.outcomeUnknown === true;
  return { code: sanitized, state: unknown || sanitized === "provider_timeout" || sanitized === "provider_unavailable" ? "unknown" : "failed" };
}

export async function sendInvitation(actor: InvitationAdminActor, input: unknown, overrides: Partial<ServiceDependencies> = {}) {
  const deps = { ...defaultDependencies, ...overrides } as ServiceDependencies;
  await deps.authorizeOwner!(actor);
  const parsed = parseInvitationInput(input);
  const { instanceId, origin } = scoped(deps);
  const mapping = await deps.findOrganizationIdentity(actor.organizationId, instanceId);
  if (!mapping) throw new ApplicationError("CONFLICT", "Organization invitation delivery is not configured.");
  const existingMember = await deps.findActiveMemberByEmail?.({ organizationId: actor.organizationId, instanceId, email: parsed.email });
  if (existingMember?.active) throw new ApplicationError("CONFLICT", "This person is already a member of the organization.");
  if (existingMember && !existingMember.active) throw new ApplicationError("CONFLICT", "This person's organization access requires administrator review.");
  const now = deps.now!();
  const previous = await deps.listPreviousInvitationsForEmail({ organizationId: actor.organizationId, instanceId, email: parsed.email, now });
  for (const old of previous) {
    if (old.deliveryState === "sent" || old.deliveryState === "unknown" || old.deliveryState === "sending" || old.providerInvitationId) {
      let found: ProviderInvitation | null;
      try { found = await (await provider(deps)).findByCorrelation(mapping.organizationSubject, old.id); }
      catch { throw new ApplicationError("CONFLICT", "A previous invitation delivery could not be reconciled. Review it before sending again."); }
      if (!found) throw new ApplicationError("CONFLICT", "A previous invitation delivery could not be reconciled. Review it before sending again.");
      if (found.status === "accepted") throw new ApplicationError("CONFLICT", "A previous invitation was accepted and needs access review.");
      if (found.status === "pending") {
        try { await (await provider(deps)).revoke(mapping.organizationSubject, found.id); }
        catch { throw new ApplicationError("CONFLICT", "A previous invitation must be revoked before sending another."); }
      }
    }
    if (old.status === "pending" && !await deps.expireInvitation(old.id, instanceId, now)) {
      throw new ApplicationError("CONFLICT", "A previous invitation changed while being reconciled. Try again.");
    }
  }
  const reservation = await deps.reserveInvitation({ organizationId: actor.organizationId, instanceId, inviterUserId: actor.userId, email: parsed.email, role: parsed.role, now });
  if (!reservation.created) return { kind: "existing" as const, invitation: asView(reservation.invitation) };
  if (!await deps.claimDelivery(reservation.invitation.id, now)) return { kind: "delivery-pending" as const, invitation: asView(reservation.invitation) };
  try {
    const sent = await (await provider(deps)).send({
      organizationSubject: mapping.organizationSubject, email: parsed.email,
      correlationId: reservation.invitation.id,
      redirectUrl: `${origin}/accept-invitation?invitation=${encodeURIComponent(reservation.invitation.id)}`,
    });
    await deps.recordDelivery(reservation.invitation.id, { state: "sent", providerInvitationId: sent.id, errorCode: null });
    return { kind: "sent" as const, invitation: { ...asView(reservation.invitation), deliveryState: "sent" as const } };
  } catch (error) {
    const safe = safeErrorCode(error);
    await deps.recordDelivery(reservation.invitation.id, { state: safe.state, providerInvitationId: null, errorCode: safe.code });
    console.warn(JSON.stringify({ event: "organization_invitation_delivery_failed", invitationId: reservation.invitation.id, errorCode: safe.code }));
    return { kind: "delivery-pending" as const, invitation: { ...asView(reservation.invitation), deliveryState: safe.state } };
  }
}

export async function retryInvitationDelivery(actor: InvitationAdminActor, invitationId: string, overrides: Partial<ServiceDependencies> = {}): Promise<InvitationView> {
  const deps = { ...defaultDependencies, ...overrides } as ServiceDependencies;
  await deps.authorizeOwner!(actor);
  const { instanceId, origin } = scoped(deps);
  const invitation = await deps.findInvitation(invitationId, instanceId);
  if (!invitation || invitation.organizationId !== actor.organizationId) throw new ApplicationError("NOT_FOUND", "Invitation was not found.");
  if (invitation.status !== "pending") throw new ApplicationError("CONFLICT", "Only pending invitations can be retried.");
  if (invitation.expiresAt.getTime() <= deps.now!().getTime()) throw new ApplicationError("CONFLICT", "Expired invitations require a fresh invitation.");
  const mapping = await deps.findOrganizationIdentity(actor.organizationId, instanceId);
  if (!mapping) throw new ApplicationError("CONFLICT", "Organization invitation delivery is not configured.");
  if (!await deps.claimDelivery(invitationId, deps.now!())) return asView(invitation);
  let found: ProviderInvitation | null;
  try {
    found = await (await provider(deps)).findByCorrelation(mapping.organizationSubject, invitationId);
  } catch (error) {
    const safe = safeErrorCode(error);
    await deps.recordDelivery(invitationId, { state: "unknown", providerInvitationId: invitation.providerInvitationId, errorCode: safe.code });
    return { ...asView(invitation), deliveryState: "unknown" };
  }
  if (found) {
    if (found.status !== "pending" && found.status !== "accepted") {
      await deps.recordDelivery(invitationId, { state: "failed", providerInvitationId: found.id, errorCode: "provider_invitation_unavailable" });
      return { ...asView(invitation), deliveryState: "failed" };
    }
    await deps.recordDelivery(invitationId, { state: "sent", providerInvitationId: found.id, errorCode: null });
    return { ...asView(invitation), deliveryState: "sent" };
  }
  if (invitation.deliveryState === "unknown" || invitation.deliveryState === "sending") {
    await deps.recordDelivery(invitationId, { state: "unknown", providerInvitationId: invitation.providerInvitationId, errorCode: "provider_outcome_unknown" });
    return { ...asView(invitation), deliveryState: "unknown" };
  }
  try {
    const sent = await (await provider(deps)).send({ organizationSubject: mapping.organizationSubject, email: invitation.email,
      correlationId: invitation.id, redirectUrl: `${origin}/accept-invitation?invitation=${encodeURIComponent(invitation.id)}` });
    await deps.recordDelivery(invitationId, { state: "sent", providerInvitationId: sent.id, errorCode: null });
    return { ...asView(invitation), deliveryState: "sent" };
  } catch (error) {
    const safe = safeErrorCode(error);
    await deps.recordDelivery(invitationId, { state: safe.state, providerInvitationId: null, errorCode: safe.code });
    return { ...asView(invitation), deliveryState: safe.state };
  }
}

export async function revokeInvitation(actor: InvitationAdminActor, invitationId: string, overrides: Partial<ServiceDependencies> = {}): Promise<InvitationView> {
  const deps = { ...defaultDependencies, ...overrides } as ServiceDependencies;
  await deps.authorizeOwner!(actor);
  const { instanceId } = scoped(deps);
  const row = await deps.revokePendingInvitation(actor, invitationId, instanceId);
  if (row.instanceId !== instanceId) throw new ApplicationError("NOT_FOUND", "Invitation was not found.");
  if (row.status !== "revoked" || !row.providerInvitationId) return asView(row);
  const mapping = await deps.findOrganizationIdentity(actor.organizationId, instanceId);
  try {
    if (!mapping) throw new Error("missing_provider_mapping");
    await (await provider(deps)).revoke(mapping.organizationSubject, row.providerInvitationId);
    await deps.markProviderCleanup(invitationId, false);
    return { ...asView(row), providerCleanupPending: false };
  } catch {
    await deps.markProviderCleanup(invitationId, true);
    console.warn(JSON.stringify({ event: "organization_invitation_provider_cleanup_pending", invitationId }));
    return { ...asView(row), providerCleanupPending: true };
  }
}

export async function listInvitations(actor: InvitationAdminActor, overrides: Partial<ServiceDependencies> = {}): Promise<InvitationView[]> {
  const deps = { ...defaultDependencies, ...overrides } as ServiceDependencies;
  await deps.authorizeOwner!(actor);
  const { instanceId } = scoped(deps);
  return deps.listInvitationViews(actor.organizationId, instanceId);
}
