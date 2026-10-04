"use client";

import { useState } from "react";
import Link from "next/link";
import { CompletionForm } from "./completion-form";

type InvitationOption = { invitationId: string; organizationName: string };

export function InvitationRecovery({ invitations }: { invitations: InvitationOption[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (invitations.length === 0) return <div className="mt-6 space-y-3">
    <p className="text-sm text-muted-foreground">Ask an organization owner to invite this account.</p>
    <Link className="inline-flex rounded-lg border border-border px-4 py-2 text-sm" href="/sign-in">Refresh account session</Link>
  </div>;
  if (invitations.length === 1) return <div className="mt-6 space-y-3">
    <p className="text-sm">Invitation found for {invitations[0].organizationName}.</p>
    <CompletionForm invitationId={invitations[0].invitationId} />
  </div>;
  if (!selected) return <div className="mt-6 space-y-3">
    <p className="text-sm">Choose which organization to open.</p>
    <ul className="space-y-2">{invitations.map((invitation) => <li key={invitation.invitationId}>
      <button className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm" onClick={() => setSelected(invitation.invitationId)} type="button">
        Continue to {invitation.organizationName}
      </button>
    </li>)}</ul>
  </div>;
  const invitation = invitations.find((item) => item.invitationId === selected);
  return invitation ? <div className="mt-6 space-y-3">
    <button className="text-sm underline" onClick={() => setSelected(null)} type="button">Choose a different organization</button>
    <p className="text-sm">Finishing access to {invitation.organizationName}.</p>
    <CompletionForm invitationId={invitation.invitationId} />
  </div> : null;
}
