import { InvitationAuth } from "@/modules/organizations/invitations/components/invitation-auth";
import { invitationIdSchema } from "@/modules/organizations/invitations/validation";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const invitation = typeof query.invitation === "string" ? invitationIdSchema.safeParse(query.invitation) : null;
  const invitationId = invitation?.success ? invitation.data : null;
  const ticketStatus = typeof query.__clerk_status === "string" && ["sign_in", "sign_up", "complete"].includes(query.__clerk_status)
    ? query.__clerk_status : null;
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-5 py-12 sm:px-8">
    <meta name="referrer" content="no-referrer" />
    <div>
      <p className="text-sm font-medium text-muted-foreground">Weft Console</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Join your organization</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in with the account that received this invitation, or create your account to continue.</p>
    </div>
    <InvitationAuth invitationId={invitationId} ticketStatus={ticketStatus} />
  </main>;
}
