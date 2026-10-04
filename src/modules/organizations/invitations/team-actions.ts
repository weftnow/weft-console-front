import { invitationIdSchema, parseInvitationInput } from "./validation";
import type { InvitationAdminActor, InvitationView } from "./types";

type TeamContext = { user: { id: string }; organization: { id: string; name: string }; membership: { role: string } };
type TeamActionState = { kind: string; message: string; invitation?: InvitationView };
type Dependencies = {
  getContext(): Promise<TeamContext>;
  sendInvitation(actor: InvitationAdminActor, input: { email: string; role: "owner" | "organizer" }): Promise<{ kind: "sent" | "existing" | "delivery-pending"; invitation: InvitationView }>;
  retryInvitationDelivery(actor: InvitationAdminActor, id: string): Promise<InvitationView>;
  revokeInvitation(actor: InvitationAdminActor, id: string): Promise<InvitationView>;
};

function actorFrom(context: TeamContext): InvitationAdminActor {
  if (context.membership.role !== "owner") throw new Error("owner_required");
  return { userId: context.user.id, organizationId: context.organization.id };
}

function safeFailure(): TeamActionState {
  return { kind: "error", message: "We could not complete that invitation action. Check the invitation and try again." };
}

export async function sendTeamInvitationWith(formData: FormData, deps: Dependencies): Promise<TeamActionState> {
  try {
    const actor = actorFrom(await deps.getContext());
    const parsed = parseInvitationInput({ email: formData.get("email"), role: formData.get("role") });
    const result = await deps.sendInvitation(actor, parsed);
    if (result.kind === "sent") return { kind: "sent", message: `Invitation sent to ${result.invitation.email} as ${result.invitation.role}.`, invitation: result.invitation };
    if (result.kind === "existing") return { kind: "existing", message: `An invitation for ${result.invitation.email} is already pending.`, invitation: result.invitation };
    return { kind: "delivery-pending", message: "Delivery could not be confirmed. Check the invitation status before retrying.", invitation: result.invitation };
  } catch (error) {
    if (error instanceof Error && error.message === "owner_required") return { kind: "error", message: "Only an organization owner can manage invitations." };
    if (error && typeof error === "object" && "issues" in error) return { kind: "error", message: "Enter a valid email and choose Owner or Organizer." };
    return safeFailure();
  }
}

export async function retryTeamInvitationWith(formData: FormData, deps: Dependencies): Promise<TeamActionState> {
  try {
    const actor = actorFrom(await deps.getContext());
    const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
    if (!parsed.success) return { kind: "error", message: "That invitation could not be found." };
    const invitation = await deps.retryInvitationDelivery(actor, parsed.data);
    const kind = invitation.deliveryState === "sent" ? "sent" : invitation.deliveryState === "unknown" ? "unknown" : invitation.deliveryState;
    const message = kind === "sent" ? `Invitation delivery is confirmed for ${invitation.email}.`
      : kind === "unknown" ? "Delivery is still unknown. Check again before sending a new invitation."
      : "Invitation delivery could not be completed. Try again later.";
    return { kind, message, invitation };
  } catch { return safeFailure(); }
}

export async function revokeTeamInvitationWith(formData: FormData, deps: Dependencies): Promise<TeamActionState> {
  try {
    const actor = actorFrom(await deps.getContext());
    const parsed = invitationIdSchema.safeParse(formData.get("invitationId"));
    if (!parsed.success) return { kind: "error", message: "That invitation could not be found." };
    const invitation = await deps.revokeInvitation(actor, parsed.data);
    return invitation.providerCleanupPending
      ? { kind: "revoked-cleanup-pending", message: "Access was revoked locally. Clerk cleanup is still pending.", invitation }
      : { kind: "revoked", message: `Invitation for ${invitation.email} was revoked.`, invitation };
  } catch { return safeFailure(); }
}
