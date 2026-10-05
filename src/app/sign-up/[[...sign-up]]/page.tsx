import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/shared/ui/auth-shell";
import { authAppearance } from "@/shared/ui/auth-appearance";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp fallbackRedirectUrl="/" appearance={authAppearance} />
    </AuthShell>
  );
}
