import Link from "next/link";
import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { listActiveMemberships } from "@/modules/organizations/repository";
import { discoverAcceptedInvitations } from "@/modules/organizations/invitations/completion";
import { InvitationRecovery } from "@/modules/organizations/invitations/components/invitation-recovery";

export const dynamic = "force-dynamic";

export default async function AccessRequiredPage() {
  const { subject } = await requireClerkSession();
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "FORBIDDEN") throw error;
  }
  const memberships = user ? await listActiveMemberships(user.id) : [];
  const invitations = await discoverAcceptedInvitations({ instanceId: process.env.WEFT_CLERK_INSTANCE_ID ?? "", subject });
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
    <h1 className="text-3xl font-semibold">Console access required</h1>
    <p className="mt-3 text-muted-foreground">Your signed-in account does not have an active organization role for this Console.</p>
    {invitations.length > 0 && <InvitationRecovery invitations={invitations} />}
    {memberships.some((membership) => membership.role === "owner" || membership.role === "organizer") &&
      <Link className="mt-6 underline" href="/select-organization">Choose an organization</Link>}
    <Link className="mt-4 underline" href="/sign-in">Refresh account session</Link>
  </main>;
}
