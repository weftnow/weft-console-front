"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { listInvitations, retryInvitationDelivery, revokeInvitation, sendInvitation } from "@/modules/organizations/invitations/service";
import { teamInvitationsEnabled } from "@/modules/organizations/invitations/availability";
import { sendTeamInvitationWith, retryTeamInvitationWith, revokeTeamInvitationWith } from "@/modules/organizations/invitations/team-actions";

const unavailable = { kind: "error", message: "Team invitations are not available yet." } as const;

const dependencies = {
  getContext: requireOrganizerPageContext,
  sendInvitation, retryInvitationDelivery, revokeInvitation,
};

export async function sendTeamInvitation(formData: FormData) {
  if (!teamInvitationsEnabled()) return unavailable;
  const result = await sendTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function retryTeamInvitation(formData: FormData) {
  if (!teamInvitationsEnabled()) return unavailable;
  const result = await retryTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function revokeTeamInvitation(formData: FormData) {
  if (!teamInvitationsEnabled()) return unavailable;
  const result = await revokeTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function loadTeamInvitations() {
  if (!teamInvitationsEnabled()) return [];
  const context = await requireOrganizerPageContext();
  if (context.membership.role !== "owner") throw new Error("Only organization owners can manage invitations.");
  return listInvitations({ userId: context.user.id, organizationId: context.organization.id });
}
