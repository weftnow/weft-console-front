"use client";

import { useState } from "react";
import { retryTeamInvitation, revokeTeamInvitation, sendTeamInvitation } from "@/app/settings/team/actions";
import { Surface } from "@/shared/ui/surface";
import { PeopleIcon } from "@/shared/ui/icons";
import type { InvitationView } from "../types";

type ActionResult = { kind: string; message: string; invitation?: InvitationView };

const stateLabels: Record<InvitationView["status"] | InvitationView["deliveryState"], string> = {
  pending: "Pending", accepted: "Accepted", revoked: "Revoked", expired: "Expired",
  queued: "Queued", sending: "Sending", sent: "Confirmed", unknown: "Unknown", failed: "Failed",
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

  return <div className="team-invitations">
    <Surface depth="raised" className="team-invite-card">
      <div className="team-invite-card__heading">
        <h2>Invite a teammate</h2>
        <p>Choose their Weft role before sending the invitation.</p>
      </div>
      <form className="team-invite-form" onSubmit={(event) => {
        event.preventDefault(); void run(event.currentTarget, "new", sendTeamInvitation);
      }}>
        <div className="team-field">
          <label htmlFor="invite-email">Work email</label>
          <input className="team-control" id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div className="team-field">
          <label htmlFor="invite-role">Weft role</label>
          <select className="team-control team-control--select" id="invite-role" name="role" defaultValue="organizer">
            <option value="owner">Owner</option>
            <option value="organizer">Organizer</option>
          </select>
        </div>
        <button className="tactile-button tactile-button--primary team-invite-submit" type="submit" disabled={pending !== null}>
          {pending === "new" ? "Sending…" : "Send invitation"}
        </button>
      </form>
      {message && <p aria-live="polite" className="team-feedback">{message}</p>}
    </Surface>

    <section className="team-history" aria-labelledby="invitation-history-title">
      <div className="team-history__heading">
        <h2 id="invitation-history-title">Invitation history</h2>
        <p>Delivery and access status for this organization.</p>
      </div>
      {invitations.length === 0 ? <div className="team-empty">
        <span className="team-empty__icon"><PeopleIcon width="20" height="20" /></span>
        <div><strong>No invitations yet</strong><p>Invitations you send will appear here with their delivery and access status.</p></div>
      </div> :
        <ul className="team-invitation-list">
          {invitations.map((invitation) => <li key={invitation.id}>
            <Surface depth="raised" className="team-invitation-row">
              <div className="team-invitation-row__content">
                <p className="team-invitation-row__email">{invitation.email}</p>
                <p className="team-invitation-row__meta"><span>{invitation.role === "owner" ? "Owner" : "Organizer"}</span><span aria-hidden="true">·</span><span>Expires <time dateTime={invitation.expiresAt}>{new Date(invitation.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></span></p>
                <div className="team-invitation-row__statuses" aria-label="Invitation status">
                  <span className="team-status"><span>Access</span><strong>{stateLabels[invitation.status]}</strong></span>
                  <span className="team-status"><span>Delivery</span><strong>{stateLabels[invitation.deliveryState]}</strong></span>
                  {invitation.providerCleanupPending && <span className="team-status team-status--notice">Clerk cleanup pending; Weft access is revoked</span>}
                </div>
              </div>
              {invitation.status === "pending" && <div className="team-invitation-row__actions">
                {(invitation.deliveryState === "failed" || invitation.deliveryState === "unknown") && <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, retryTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="tactile-button team-action" disabled={pending !== null} type="submit">{pending === invitation.id ? "Checking…" : "Check / retry"}</button></form>}
                <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, revokeTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="tactile-button team-action" disabled={pending !== null} type="submit">Revoke</button></form>
              </div>}
            </Surface>
          </li>)}
        </ul>}
    </section>
  </div>;
}
