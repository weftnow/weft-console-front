"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { CompletionForm } from "./completion-form";

type InvitationOption = { invitationId: string; organizationName: string };

export function InvitationRecovery({ invitations, retryable = false }: { invitations: InvitationOption[]; retryable?: boolean }) {
  const { dict, t } = useI18n();
  const copy = dict.organizations.invitation.recovery;
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();
  if (invitations.length === 0 && retryable) return <div className="mt-6 space-y-3">
    <p className="text-sm text-muted-foreground">{copy.verifyFailed}</p>
    <button className="inline-flex rounded-lg border border-border px-4 py-2 text-sm" onClick={() => router.refresh()} type="button">{dict.common.actions.retry}</button>
  </div>;
  if (invitations.length === 0) return <div className="mt-6 space-y-3">
    <p className="text-sm text-muted-foreground">{copy.askOwner}</p>
    <Link className="inline-flex rounded-lg border border-border px-4 py-2 text-sm" href="/sign-in">{dict.auth.accessRequired.refresh}</Link>
  </div>;
  if (invitations.length === 1) return <div className="mt-6 space-y-3">
    <p className="text-sm">{t(copy.found, { organization: invitations[0].organizationName })}</p>
    <CompletionForm invitationId={invitations[0].invitationId} />
  </div>;
  if (!selected) return <div className="mt-6 space-y-3">
    <p className="text-sm">{copy.choose}</p>
    <ul className="space-y-2">{invitations.map((invitation) => <li key={invitation.invitationId}>
      <button className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm" onClick={() => setSelected(invitation.invitationId)} type="button">
        {t(copy.continueTo, { organization: invitation.organizationName })}
      </button>
    </li>)}</ul>
  </div>;
  const invitation = invitations.find((item) => item.invitationId === selected);
  return invitation ? <div className="mt-6 space-y-3">
    <button className="text-sm underline" onClick={() => setSelected(null)} type="button">{copy.chooseDifferent}</button>
    <p className="text-sm">{t(copy.finishing, { organization: invitation.organizationName })}</p>
    <CompletionForm invitationId={invitation.invitationId} />
  </div> : null;
}
