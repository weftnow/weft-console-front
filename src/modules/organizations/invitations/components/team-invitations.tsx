"use client";

import { useState } from "react";
import { retryTeamInvitation, revokeTeamInvitation, sendTeamInvitation } from "@/app/settings/team/actions";
import { Surface } from "@/shared/ui/surface";
import type { InvitationView } from "../types";

type ActionResult = { kind: string; message: string; invitation?: InvitationView };

const stateLabels: Record<InvitationView["status"] | InvitationView["deliveryState"], string> = {
  pending: "Pending", accepted: "Accepted", revoked: "Revoked", expired: "Expired",
  queued: "Queued", sending: "Sending", sent: "Delivery confirmed", unknown: "Delivery unknown", failed: "Delivery failed",
};

export function TeamInvitations({ invitations: initialInvitations }: { invitations: InvitationView[] }) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(form: HTMLFormElement, invitationId: string, action: (data: FormData) => Promise<ActionResult>) {
    if (pending) return;
    setPending(invitationId);
    setMessage("");
    try {
      const result = await action(new FormData(form));
      setMessage(result.message);
      if (result.invitation) setInvitations((current) => {
        const exists = current.some((item) => item.id === result.invitation?.id);
        return exists ? current.map((item) => item.id === result.invitation?.id ? result.invitation! : item)
          : [result.invitation!, ...current];
      });
    } catch {
      setMessage("We could not complete that invitation action. Try again.");
    } finally { setPending(null); }
  }

  return <div className="space-y-6">
    <Surface depth="raised" className="rounded-2xl p-5 sm:p-7">
      <h2 className="text-lg font-semibold">Invite a teammate</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose their Weft role before sending the invitation.</p>
      <form className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end" onSubmit={(event) => {
        event.preventDefault(); void run(event.currentTarget, "new", sendTeamInvitation);
      }}>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="invite-email">Work email</label>
          <input className="min-h-11 rounded-lg border border-border bg-background px-3" id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="invite-role">Weft role</label>
          <select className="min-h-11 rounded-lg border border-border bg-background px-3" id="invite-role" name="role" defaultValue="organizer">
            <option value="owner">Owner</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
        <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50" type="submit" disabled={pending !== null}>
          {pending === "new" ? "Sending…" : "Send invitation"}
        </button>
      </form>
      {message && <p aria-live="polite" className="mt-4 text-sm">{message}</p>}
    </Surface>

    <section aria-labelledby="invitation-history-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div><h2 className="text-lg font-semibold" id="invitation-history-title">Invitation history</h2>
          <p className="mt-1 text-sm text-muted-foreground">Delivery and access status for this organization.</p></div>
      </div>
      {invitations.length === 0 ? <Surface className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">No invitations yet.</Surface> :
        <ul className="space-y-3">
          {invitations.map((invitation) => <li key={invitation.id}>
            <Surface depth="raised" className="flex min-w-0 flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="break-words font-medium">{invitation.email}</p>
                <p className="mt-1 text-sm text-muted-foreground">{invitation.role === "owner" ? "Owner" : "Organizer"} · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border px-2.5 py-1">{stateLabels[invitation.status]}</span>
                  <span className="rounded-full border border-border px-2.5 py-1">{stateLabels[invitation.deliveryState]}</span>
                  {invitation.providerCleanupPending && <span className="rounded-full border border-amber-600/40 px-2.5 py-1 text-amber-800">Clerk cleanup pending; Weft access is revoked</span>}
                </div>
              </div>
              {invitation.status === "pending" && <div className="flex shrink-0 flex-wrap gap-2">
                {(invitation.deliveryState === "failed" || invitation.deliveryState === "unknown") && <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, retryTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50" disabled={pending !== null} type="submit">{pending === invitation.id ? "Checking…" : "Check / retry"}</button></form>}
                <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, revokeTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-50" disabled={pending !== null} type="submit">Revoke</button></form>
              </div>}
            </Surface>
          </li>)}
        </ul>}
    </section>
  </div>;
}
