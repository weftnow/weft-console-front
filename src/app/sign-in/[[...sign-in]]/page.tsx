import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/shared/ui/auth-shell";
import { authAppearance } from "@/shared/ui/auth-appearance";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn fallbackRedirectUrl="/" appearance={authAppearance} />
    </AuthShell>
  );
}
