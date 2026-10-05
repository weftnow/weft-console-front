import "server-only";
import { getDatabase } from "@/infrastructure/database/client";
import { getInvitationProvider } from "@/modules/organizations/invitations/clerk-provider";
import type { CompletionResult, ProviderAcceptance } from "@/modules/organizations/invitations/types";
import { createCustomerProvisioningRepository } from "./repository";

type Provider = {
  readAcceptance(organizationSubject: string, subject: string, correlationId: string): Promise<ProviderAcceptance | null>;
  findVerifiedEmails(subject: string): Promise<string[]>;
};
type Repository = ReturnType<typeof createCustomerProvisioningRepository>;
type Dependencies = Partial<Repository> & { instanceId?: string; provider?: Provider };

function defaults(overrides: Dependencies) {
  let base: Repository | undefined;
  const repository = () => base ??= createCustomerProvisioningRepository(getDatabase());
  const methods: Array<keyof Repository> = ["findProvisioningForInvitation", "findOrganizationIdentity", "listOwnerInvitationCandidates", "commitInitialOwner"];
  const deps: Record<string, unknown> = { instanceId: process.env.WEFT_CLERK_INSTANCE_ID, provider: undefined, ...overrides };
  for (const method of methods) deps[method] = overrides[method] ?? ((...args: unknown[]) => (repository()[method] as (...values: unknown[]) => unknown)(...args));
  return deps as Dependencies & Pick<Repository, typeof methods[number]>;
}

async function transport(deps: Dependencies): Promise<Provider> {
  return deps.provider ?? getInvitationProvider();
}

function exactEvidence(evidence: ProviderAcceptance, input: { subject: string; organizationSubject: string; invitationId: string; email: string }) {
  return evidence.subject === input.subject && evidence.organizationSubject === input.organizationSubject &&
    evidence.correlationId === input.invitationId && Boolean(evidence.membershipId.trim()) &&
    evidence.invitationEmail.trim().toLowerCase() === input.email &&
    evidence.verifiedEmails.some((email) => email.trim().toLowerCase() === input.email);
}

export async function completeInitialOwner(
  input: { instanceId: string; subject: string; invitationId: string }, overrides: Dependencies = {},
): Promise<CompletionResult> {
  const deps = defaults(overrides);
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId || !input.subject.trim()) return { kind: "unavailable" };
  try {
    const record = await deps.findProvisioningForInvitation(input.invitationId, input.instanceId);
    if (!record) return { kind: "unavailable" };
    const { provisioning, invitation } = record;
    if (provisioning.status === "cancelled") return { kind: "unavailable" };
    if (provisioning.status === "consumed") {
      if (provisioning.consumedSubject !== input.subject || invitation.acceptedSubject !== input.subject) return { kind: "wrong-account" };
      const acceptedAt = invitation.acceptedAt ?? new Date(0);
      const replayEvidence: ProviderAcceptance = { subject: input.subject, organizationSubject: "consumed", membershipId: "consumed",
        correlationId: invitation.id, invitationEmail: provisioning.ownerEmail, acceptedAt,
        verifiedEmails: [provisioning.ownerEmail], displayName: "", avatarUrl: null };
      return deps.commitInitialOwner({ instanceId: input.instanceId, invitationId: invitation.id, evidence: replayEvidence });
    }
    if (provisioning.status !== "pending" || invitation.status !== "pending") return { kind: "unavailable" };
    const mapping = await deps.findOrganizationIdentity(provisioning.organizationId, input.instanceId);
    if (!mapping) return { kind: "conflict" };
    const evidence = await (await transport(deps)).readAcceptance(mapping.organizationSubject, input.subject, invitation.id);
    if (!evidence) return { kind: "unavailable" };
    if (evidence.subject !== input.subject || !evidence.verifiedEmails.some((email) => email.trim().toLowerCase() === provisioning.ownerEmail)) return { kind: "wrong-account" };
    if (!exactEvidence(evidence, { subject: input.subject, organizationSubject: mapping.organizationSubject, invitationId: invitation.id, email: provisioning.ownerEmail }) ||
      evidence.acceptedAt < invitation.createdAt || evidence.acceptedAt > invitation.expiresAt || evidence.acceptedAt > new Date()) return { kind: "conflict" };
    const safeEvidence: ProviderAcceptance = {
      ...evidence,
      displayName: evidence.displayName.trim().slice(0, 160) || provisioning.ownerEmail,
      avatarUrl: (() => { try { return evidence.avatarUrl && new URL(evidence.avatarUrl).protocol === "https:" ? evidence.avatarUrl : null; } catch { return null; } })(),
    };
    return await deps.commitInitialOwner({ instanceId: input.instanceId, invitationId: invitation.id, evidence: safeEvidence });
  } catch { return { kind: "retry" }; }
}

export async function discoverInitialOwnerInvitations(
  input: { instanceId: string; subject: string }, overrides: Dependencies = {},
): Promise<Array<{ invitationId: string; organizationName: string }>> {
  const deps = defaults(overrides);
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId || !input.subject.trim()) return [];
  const provider = await transport(deps);
  const emails = await provider.findVerifiedEmails(input.subject);
  const candidates = await deps.listOwnerInvitationCandidates(input.instanceId, emails.map((email) => email.trim().toLowerCase()));
  const found: Array<{ invitationId: string; organizationName: string }> = [];
  for (const candidate of candidates) {
    const evidence = await provider.readAcceptance(candidate.organizationSubject, input.subject, candidate.invitationId);
    if (!evidence || evidence.acceptedAt < candidate.createdAt || evidence.acceptedAt > candidate.expiresAt ||
      !exactEvidence(evidence, { subject: input.subject, organizationSubject: candidate.organizationSubject,
        invitationId: candidate.invitationId, email: candidate.email })) continue;
    found.push({ invitationId: candidate.invitationId, organizationName: candidate.organizationName });
  }
  return found;
}
