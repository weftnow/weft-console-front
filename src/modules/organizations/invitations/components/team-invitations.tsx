"use client";

import { useState } from "react";
import { retryTeamInvitation, revokeTeamInvitation, sendTeamInvitation } from "@/app/settings/team/actions";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Surface } from "@/shared/ui/surface";
import { PeopleIcon } from "@/shared/ui/icons";
import type { TeamResultCode } from "../team-actions";
import type { InvitationView } from "../types";

type ActionResult = { kind: string; code: TeamResultCode; message: string; params?: { email?: string; role?: string }; invitation?: InvitationView };

export function TeamInvitations({ invitations: initialInvitations }: { invitations: InvitationView[] }) {
  const { dict, t, date } = useI18n();
  const copy = dict.organizations.team;
  const [invitations, setInvitations] = useState(initialInvitations);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function run(form: HTMLFormElement, invitationId: string, action: (data: FormData) => Promise<ActionResult>) {
    if (pending) return;
    setPending(invitationId);
    setMessage("");
    try {
      const result = await action(new FormData(form));
      const role = result.params?.role ? dict.common.roles[result.params.role as keyof typeof dict.common.roles] ?? result.params.role : "";
      setMessage(t(copy.results[result.code], { email: result.params?.email ?? "", role }));
      if (result.invitation) setInvitations((current) => {
        const exists = current.some((item) => item.id === result.invitation?.id);
        return exists ? current.map((item) => item.id === result.invitation?.id ? result.invitation! : item)
          : [result.invitation!, ...current];
      });
    } catch {
      setMessage(copy.results.action_failed);
    } finally { setPending(null); }
  }

  return <div className="team-invitations">
    <Surface depth="raised" className="team-invite-card">
      <div className="team-invite-card__heading">
        <h2>{copy.invite.heading}</h2>
        <p>{copy.invite.hint}</p>
      </div>
      <form className="team-invite-form" onSubmit={(event) => {
        event.preventDefault(); void run(event.currentTarget, "new", sendTeamInvitation);
      }}>
        <div className="team-field">
          <label htmlFor="invite-email">{copy.invite.email}</label>
          <input className="team-control" id="invite-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
        <div className="team-field">
          <label htmlFor="invite-role">{copy.invite.role}</label>
          <select className="team-control team-control--select" id="invite-role" name="role" defaultValue="organizer">
            <option value="owner">{dict.common.roles.owner}</option>
            <option value="organizer">{dict.common.roles.organizer}</option>
            <option value="staff">{dict.common.roles.staff}</option>
          </select>
        </div>
        <button className="tactile-button tactile-button--primary team-invite-submit" type="submit" disabled={pending !== null}>
          {pending === "new" ? copy.invite.sending : copy.invite.send}
        </button>
      </form>
      {message && <p aria-live="polite" className="team-feedback">{message}</p>}
    </Surface>

    <section className="team-history" aria-labelledby="invitation-history-title">
      <div className="team-history__heading">
        <h2 id="invitation-history-title">{copy.history.heading}</h2>
        <p>{copy.history.description}</p>
      </div>
      {invitations.length === 0 ? <div className="team-empty">
        <span className="team-empty__icon"><PeopleIcon width="20" height="20" /></span>
        <div><strong>{copy.history.emptyTitle}</strong><p>{copy.history.emptyText}</p></div>
      </div> :
        <ul className="team-invitation-list">
          {invitations.map((invitation) => <li key={invitation.id}>
            <Surface depth="raised" className="team-invitation-row">
              <div className="team-invitation-row__content">
                <p className="team-invitation-row__email">{invitation.email}</p>
                <p className="team-invitation-row__meta"><span>{invitation.role === "owner" ? dict.common.roles.owner : invitation.role === "staff" ? dict.common.roles.staff : dict.common.roles.organizer}</span><span aria-hidden="true">·</span><span><time dateTime={invitation.expiresAt}>{t(copy.history.expires, { date: date(invitation.expiresAt, { month: "short", day: "numeric", year: "numeric" }) })}</time></span></p>
                <div className="team-invitation-row__statuses" aria-label={copy.history.statusLabel}>
                  <span className="team-status"><span>{copy.history.access}</span><strong>{copy.states[invitation.status]}</strong></span>
                  <span className="team-status"><span>{copy.history.delivery}</span><strong>{copy.states[invitation.deliveryState]}</strong></span>
                  {invitation.providerCleanupPending && <span className="team-status team-status--notice">{copy.history.cleanupPending}</span>}
                </div>
              </div>
              {invitation.status === "pending" && <div className="team-invitation-row__actions">
                {(invitation.deliveryState === "failed" || invitation.deliveryState === "unknown") && <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, retryTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="tactile-button team-action" disabled={pending !== null} type="submit">{pending === invitation.id ? copy.actions.checking : copy.actions.checkRetry}</button></form>}
                <form onSubmit={(event) => {
                  event.preventDefault(); void run(event.currentTarget, invitation.id, revokeTeamInvitation);
                }}><input type="hidden" name="invitationId" value={invitation.id} /><button className="tactile-button team-action" disabled={pending !== null} type="submit">{copy.actions.revoke}</button></form>
              </div>}
            </Surface>
          </li>)}
        </ul>}
    </section>
  </div>;
}
