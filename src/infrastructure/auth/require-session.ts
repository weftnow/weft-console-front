import "server-only";
import { auth } from "@clerk/nextjs/server";

type SessionState = { userId: string | null; sessionStatus?: string };

export function createRequireClerkSession(
  readAuth: () => Promise<SessionState & { redirectToSignIn: () => Promise<never> | never }>,
  redirect: (session: SessionState & { redirectToSignIn: () => Promise<never> | never }) => Promise<never> | never,
) {
  return async function requireActiveClerkSession(): Promise<{ subject: string }> {
    const session = await readAuth();
    if (!session.userId || session.sessionStatus !== "active") return redirect(session);
    return { subject: session.userId };
  };
}

export async function requireClerkSession(): Promise<{ subject: string }> {
  const session = await auth();
  if (!session.userId || session.sessionStatus !== "active") {
    await session.redirectToSignIn();
    throw new Error("Clerk sign-in redirect did not complete.");
  }
  return { subject: session.userId };
}
