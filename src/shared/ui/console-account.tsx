"use client";

import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearOrganizationSelectionCookie, switchOrganization } from "@/app/account/actions";

export function ConsoleAccount({ user, organization }: {
  user: { id: string; displayName: string };
  organization: { name: string; role: string };
}) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [clerkUser?.id, router]);

  return <div className="profile">
    <div className="profile__identity">
      <div className="profile__avatar"><UserButton /></div>
      <div className="profile__text">
        <span className="profile__name" title={user.displayName}>{user.displayName}</span>
        <span className="profile__role">{organization.role}</span>
      </div>
      {organization.role === "owner" ? <Link className="text-xs underline underline-offset-4" href="/settings/team">Team</Link> : null}
      <Link className="text-xs underline underline-offset-4" href="/onboarding">Accept invitation</Link>
      <form action={switchOrganization}><button className="text-xs underline underline-offset-4" type="submit">Switch organization</button></form>
      <button className="text-xs underline underline-offset-4" onClick={async () => {
        await clearOrganizationSelectionCookie();
        await clerk.signOut({ redirectUrl: "/sign-in" });
      }} type="button">Sign out</button>
    </div>
  </div>;
}
