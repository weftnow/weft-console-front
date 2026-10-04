"use client";

import { RedirectToTasks, SignIn, SignUp, useSession } from "@clerk/nextjs";
import { useEffect } from "react";
import { CompletionForm } from "./completion-form";

export function InvitationAuth({ invitationId, ticketStatus }: {
  invitationId: string | null;
  ticketStatus: string | null;
}) {
  const { isLoaded, isSignedIn, session } = useSession();
  const sessionStatus = session?.status;
  useEffect(() => {
    if (!invitationId || !isSignedIn || sessionStatus !== "active") return;
    const current = new URL(window.location.href);
    if (current.searchParams.has("__clerk_ticket") || current.searchParams.has("__clerk_status")) {
      window.history.replaceState(null, "", `/accept-invitation?invitation=${encodeURIComponent(invitationId)}`);
    }
  }, [invitationId, isSignedIn, sessionStatus]);

  if (!invitationId) return <p className="text-sm text-muted-foreground">This invitation link is not available.</p>;
  if (!isLoaded) return <p className="text-sm text-muted-foreground">Loading secure sign-in…</p>;
  if (isSignedIn && sessionStatus === "pending") return <RedirectToTasks />;
  if (isSignedIn && sessionStatus === "active") return <CompletionForm invitationId={invitationId} />;
  if (ticketStatus === "sign_up") return <SignUp />;
  return <SignIn />;
}
