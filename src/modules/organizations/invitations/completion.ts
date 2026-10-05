import "server-only";
import * as repository from "./repository";
import { getInvitationProvider } from "./clerk-provider";
import { matchesInvitationEmail } from "./validation";
import type { CompletionResult, ProviderAcceptance } from "./types";

type Provider = {
  readAcceptance(organizationSubject: string, subject: string, correlationId: string): Promise<ProviderAcceptance | null>;
  findVerifiedEmails(subject: string): Promise<string[]>;
};
type CompletionDependencies = typeof repository & {
  instanceId?: string;
  provider?: Provider;
};

const defaults: CompletionDependencies = { ...repository, instanceId: process.env.WEFT_CLERK_INSTANCE_ID, provider: undefined };

async function provider(deps: CompletionDependencies): Promise<Provider> {
  return deps.provider ?? getInvitationProvider();
}

function exactEvidence(evidence: ProviderAcceptance, input: { organizationSubject: string; subject: string; invitationId: string; email: string }) {
  return evidence.subject === input.subject && evidence.organizationSubject === input.organizationSubject &&
    evidence.correlationId === input.invitationId && evidence.membershipId.length > 0 &&
    evidence.invitationEmail.trim().toLowerCase() === input.email &&
    matchesInvitationEmail(input.email, evidence.verifiedEmails);
}

export async function completeInvitation(
  input: { instanceId: string; subject: string; invitationId: string }, overrides: Partial<CompletionDependencies> = {},
): Promise<CompletionResult> {
  const deps = { ...defaults, ...overrides } as CompletionDependencies;
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId) return { kind: "unavailable" };
  try {
    const invitation = await deps.findInvitation(input.invitationId, input.instanceId);
    if (!invitation || invitation.instanceId !== input.instanceId) return { kind: "unavailable" };
    if (invitation.status !== "pending" && invitation.status !== "accepted") return { kind: "unavailable" };
    const mapping = await deps.findOrganizationIdentity(invitation.organizationId, input.instanceId);
    if (!mapping) return { kind: "conflict" };
    const evidence = await (await provider(deps)).readAcceptance(mapping.organizationSubject, input.subject, invitation.id);
    if (!evidence) return { kind: "unavailable" };
    if (evidence.subject !== input.subject || !matchesInvitationEmail(invitation.email, evidence.verifiedEmails)) return { kind: "wrong-account" };
    if (!exactEvidence(evidence, { organizationSubject: mapping.organizationSubject, subject: input.subject, invitationId: invitation.id, email: invitation.email })) return { kind: "conflict" };
    const accepted = await deps.commitAdmission({ invitationId: invitation.id, instanceId: input.instanceId, evidence: {
      ...evidence,
      displayName: evidence.displayName.trim().slice(0, 160) || invitation.email,
      avatarUrl: (() => {
        try { return evidence.avatarUrl && new URL(evidence.avatarUrl).protocol === "https:" ? evidence.avatarUrl : null; }
        catch { return null; }
      })(),
    } });
    return accepted;
  } catch {
    return { kind: "retry" };
  }
}

export async function discoverAcceptedInvitations(
  input: { instanceId: string; subject: string }, overrides: Partial<CompletionDependencies> = {},
): Promise<Array<{ invitationId: string; organizationName: string }>> {
  const deps = { ...defaults, ...overrides } as CompletionDependencies;
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId) return [];
  const transport = await provider(deps);
  const emails = await transport.findVerifiedEmails(input.subject);
  const candidates = await deps.listInvitationCandidates({ instanceId: input.instanceId, emails });
  const discovered: Array<{ invitationId: string; organizationName: string }> = [];
  for (const candidate of candidates) {
    const evidence = await transport.readAcceptance(candidate.organizationSubject, input.subject, candidate.invitationId);
    if (!evidence || !exactEvidence(evidence, {
      organizationSubject: candidate.organizationSubject, subject: input.subject,
      invitationId: candidate.invitationId, email: candidate.email,
    })) continue;
    discovered.push({ invitationId: candidate.invitationId, organizationName: candidate.organizationName });
  }
  return discovered;
}
