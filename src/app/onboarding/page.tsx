import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { discoverConsoleInvitations } from "@/modules/organizations/invitations/admission";
import { InvitationRecovery } from "@/modules/organizations/invitations/components/invitation-recovery";
import { getI18n } from "@/shared/i18n/get-locale";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { dict } = await getI18n();
  const { subject } = await requireClerkSession();
  const instanceId = process.env.WEFT_CLERK_INSTANCE_ID ?? "";
  let invitations: Array<{ invitationId: string; organizationName: string }> = [];
  let retryable = false;
  try { invitations = await discoverConsoleInvitations({ instanceId, subject }); }
  catch { retryable = true; }
  return <AuthShell title={dict.auth.onboarding.title} description={dict.auth.onboarding.description}>
    <InvitationRecovery invitations={invitations} retryable={retryable} />
  </AuthShell>;
}
