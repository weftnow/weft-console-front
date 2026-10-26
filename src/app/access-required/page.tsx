import Link from "next/link";
import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { discoverConsoleInvitations } from "@/modules/organizations/invitations/admission";
import { InvitationRecovery } from "@/modules/organizations/invitations/components/invitation-recovery";
import { getI18n } from "@/shared/i18n/get-locale";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function AccessRequiredPage() {
  const { dict } = await getI18n();
  const { subject } = await requireClerkSession();
  try {
    await getCurrentUser();
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "FORBIDDEN") throw error;
  }
  let invitations: Array<{ invitationId: string; organizationName: string }> = [];
  let retryable = false;
  try { invitations = await discoverConsoleInvitations({ instanceId: process.env.WEFT_CLERK_INSTANCE_ID ?? "", subject }); }
  catch { retryable = true; }
  return <AuthShell title={dict.auth.accessRequired.title} description={dict.auth.accessRequired.description}>
    {(invitations.length > 0 || retryable) && <InvitationRecovery invitations={invitations} retryable={retryable} />}
    <Link className="mt-6 inline-block text-sm underline underline-offset-4" href="/sign-in">{dict.auth.accessRequired.refresh}</Link>
  </AuthShell>;
}
