"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { finishInvitation } from "@/app/accept-invitation/actions";
import { clearOrganizationSelection } from "@/app/account/actions";
import { useI18n } from "@/shared/i18n/I18nProvider";
import type { FinishInvitationState } from "../action-logic";

const initialState: FinishInvitationState = { kind: "retry" };

export function CompletionForm({ invitationId }: { invitationId: string }) {
  const { dict } = useI18n();
  const copy = dict.organizations.invitation.completion;
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
  const message = state.kind === "wrong-account" ? copy.wrongAccount
    : state.kind === "conflict" ? copy.conflict
    : state.kind === "unavailable" ? copy.unavailable
    : copy.retry;

  return <div className="space-y-3" aria-live="polite">
    <p className="text-sm text-muted-foreground">{busy ? copy.settingUp : message}</p>
    {!busy && state.kind === "wrong-account" && <button className="rounded-lg border border-border px-4 py-2 text-sm" type="button" onClick={async () => {
      await clearOrganizationSelection();
      await clerk.signOut({ redirectUrl: `/sign-in?redirect_url=${encodeURIComponent(`/accept-invitation?invitation=${invitationId}`)}` });
    }}>{copy.signOutUseInvited}</button>}
    {!busy && retryable && <form action={action}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="rounded-lg border border-border px-4 py-2 text-sm" type="submit">{dict.common.actions.retry}</button>
    </form>}
  </div>;
}
