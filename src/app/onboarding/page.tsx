import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { discoverAcceptedInvitations } from "@/modules/organizations/invitations/completion";
import { InvitationRecovery } from "@/modules/organizations/invitations/components/invitation-recovery";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { subject } = await requireClerkSession();
  const instanceId = process.env.WEFT_CLERK_INSTANCE_ID ?? "";
  const invitations = await discoverAcceptedInvitations({ instanceId, subject });
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12 sm:px-8">
    <p className="text-sm font-medium text-muted-foreground">Weft Console</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight">Finish invitation setup</h1>
    <p className="mt-2 text-sm text-muted-foreground">We’ll verify accepted invitations before opening an organization.</p>
    <InvitationRecovery invitations={invitations} />
  </main>;
}
