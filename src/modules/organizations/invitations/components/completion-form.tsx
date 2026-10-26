"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { finishInvitation } from "@/app/accept-invitation/actions";
import { clearOrganizationSelection } from "@/app/account/actions";
import type { FinishInvitationState } from "../action-logic";

const initialState: FinishInvitationState = { kind: "retry" };

export function CompletionForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(finishInvitation, initialState);
  const [isStarting, startTransition] = useTransition();
  const started = useRef(false);
  const clerk = useClerk();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const data = new FormData();
    data.set("invitationId", invitationId);
    startTransition(() => action(data));
  }, [action, invitationId]);

  const busy = pending || isStarting;
  const retryable = state.kind === "retry";
  const message = state.kind === "wrong-account" ? "This invitation belongs to another signed-in account."
    : state.kind === "conflict" ? "This organization access needs owner review."
    : state.kind === "unavailable" ? "This invitation is no longer available or could not be verified."
    : "We couldn't finish setting up your access. Try again.";

  return <div className="space-y-3" aria-live="polite">
    <p className="text-sm text-muted-foreground">{busy ? "Setting up your access…" : message}</p>
    {!busy && state.kind === "wrong-account" && <button className="rounded-lg border border-border px-4 py-2 text-sm" type="button" onClick={async () => {
      await clearOrganizationSelection();
      await clerk.signOut({ redirectUrl: `/sign-in?redirect_url=${encodeURIComponent(`/accept-invitation?invitation=${invitationId}`)}` });
    }}>Sign out and use the invited account</button>}
    {!busy && retryable && <form action={action}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="rounded-lg border border-border px-4 py-2 text-sm" type="submit">Try again</button>
    </form>}
  </div>;
}
