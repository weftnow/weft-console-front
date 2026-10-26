import { InvitationAuth } from "@/modules/organizations/invitations/components/invitation-auth";
import { invitationIdSchema } from "@/modules/organizations/invitations/validation";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const invitation = typeof query.invitation === "string" ? invitationIdSchema.safeParse(query.invitation) : null;
  const invitationId = invitation?.success ? invitation.data : null;
  const ticketStatus = typeof query.__clerk_status === "string" && ["sign_in", "sign_up", "complete"].includes(query.__clerk_status)
    ? query.__clerk_status : null;
  return <AuthShell title="Join your organization" description="Sign in with the account that received this invitation, or create your account to continue.">
    <meta name="referrer" content="no-referrer" />
    <InvitationAuth invitationId={invitationId} ticketStatus={ticketStatus} />
  </AuthShell>;
}
