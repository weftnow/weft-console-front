"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { completeInvitation } from "@/modules/organizations/invitations/completion";
import { finishInvitationWith, type FinishInvitationState } from "@/modules/organizations/invitations/action-logic";

export async function finishInvitation(_previous: FinishInvitationState, formData: FormData): Promise<FinishInvitationState> {
  const { subject } = await requireClerkSession();
  const result = await finishInvitationWith(formData.get("invitationId"), { subject, sessionStatus: "active" }, {
    instanceId: process.env.WEFT_CLERK_INSTANCE_ID,
    completeInvitation,
    setOrganizationSelection: async ({ userId, organizationId }) => {
      (await cookies()).set("weft_organization_id", JSON.stringify({ userId, organizationId }), {
        httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
      });
    },
  });
  if (result.kind === "complete") redirect("/");
  return result;
}
