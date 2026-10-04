"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { listInvitations, retryInvitationDelivery, revokeInvitation, sendInvitation } from "@/modules/organizations/invitations/service";
import { sendTeamInvitationWith, retryTeamInvitationWith, revokeTeamInvitationWith } from "@/modules/organizations/invitations/team-actions";

const dependencies = {
  getContext: requireOrganizerPageContext,
  sendInvitation, retryInvitationDelivery, revokeInvitation,
};

export async function sendTeamInvitation(formData: FormData) {
  const result = await sendTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function retryTeamInvitation(formData: FormData) {
  const result = await retryTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function revokeTeamInvitation(formData: FormData) {
  const result = await revokeTeamInvitationWith(formData, dependencies);
  if (result.kind !== "error") revalidatePath("/settings/team");
  return result;
}

export async function loadTeamInvitations() {
  const context = await requireOrganizerPageContext();
  if (context.membership.role !== "owner") throw new Error("Only organization owners can manage invitations.");
  return listInvitations({ userId: context.user.id, organizationId: context.organization.id });
}
