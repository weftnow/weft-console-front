import "server-only";
import { getDatabase } from "@/infrastructure/database/client";
import { completeInitialOwner, discoverInitialOwnerInvitations } from "@/modules/organizations/customer-provisioning/completion";
import { createCustomerProvisioningRepository } from "@/modules/organizations/customer-provisioning/repository";
import { completeInvitation, discoverAcceptedInvitations } from "./completion";
import * as teamRepository from "./repository";
import type { CompletionResult } from "./types";

type Input = { instanceId: string; subject: string; invitationId: string };
type DiscoveryInput = { instanceId: string; subject: string };
type Dependencies = {
  instanceId?: string;
  findTeamInvitation: typeof teamRepository.findInvitation;
  findOwnerInvitation(invitationId: string, instanceId: string): Promise<unknown>;
  completeTeamInvitation(input: Input): Promise<CompletionResult>;
  completeInitialOwner(input: Input): Promise<CompletionResult>;
  discoverTeamInvitations(input: DiscoveryInput): Promise<Array<{ invitationId: string; organizationName: string }>>;
  discoverInitialOwnerInvitations(input: DiscoveryInput): Promise<Array<{ invitationId: string; organizationName: string }>>;
};

function dependencies(overrides: Partial<Dependencies>): Dependencies {
  const database = () => getDatabase();
  const defaults: Dependencies = {
    instanceId: process.env.WEFT_CLERK_INSTANCE_ID,
    findTeamInvitation: (id, instanceId) => teamRepository.findInvitation(id, instanceId),
    findOwnerInvitation: (id, instanceId) => createCustomerProvisioningRepository(database()).findOwnerInvitation(id, instanceId),
    completeTeamInvitation: completeInvitation,
    completeInitialOwner,
    discoverTeamInvitations: discoverAcceptedInvitations,
    discoverInitialOwnerInvitations,
  };
  return { ...defaults, ...overrides };
}

export async function completeConsoleInvitation(input: Input, overrides: Partial<Dependencies> = {}): Promise<CompletionResult> {
  const deps = dependencies(overrides);
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId || !input.subject.trim()) return { kind: "unavailable" };
  const [teamInvitation, ownerInvitation] = await Promise.all([
    deps.findTeamInvitation(input.invitationId, input.instanceId),
    deps.findOwnerInvitation(input.invitationId, input.instanceId),
  ]);
  if (teamInvitation && ownerInvitation) return { kind: "conflict" };
  if (teamInvitation) return deps.completeTeamInvitation(input);
  if (ownerInvitation) return deps.completeInitialOwner(input);
  return { kind: "unavailable" };
}

export async function discoverConsoleInvitations(input: DiscoveryInput, overrides: Partial<Dependencies> = {}) {
  const deps = dependencies(overrides);
  if (!deps.instanceId?.trim() || input.instanceId !== deps.instanceId || !input.subject.trim()) return [];
  const [team, owner] = await Promise.all([deps.discoverTeamInvitations(input), deps.discoverInitialOwnerInvitations(input)]);
  const combined = [...team, ...owner];
  const seen = new Set<string>();
  return combined.filter((invitation) => {
    if (seen.has(invitation.invitationId)) return false;
    seen.add(invitation.invitationId);
    return true;
  });
}
