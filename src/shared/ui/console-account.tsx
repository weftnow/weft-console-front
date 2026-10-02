"use client";

import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearOrganizationSelection } from "@/app/account/actions";

export function ConsoleAccount({ user, organization }: {
  user: { id: string; displayName: string };
  organization: { name: string; role: string };
}) {
  const clerk = useClerk();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [clerkUser?.id, router]);

  async function signOut() {
    await clearOrganizationSelection();
    await clerk.signOut({ redirectUrl: "/sign-in" });
  }

  return <div className="profile">
    <UserButton />
    <div className="profile__text">
      <span className="profile__name">{user.displayName}</span>
      <span className="profile__role">{organization.name} · {organization.role}</span>
      <a className="profile__switch" href="/select-organization">Switch organization</a>
      <button className="profile__logout" onClick={signOut} type="button">Sign out</button>
    </div>
  </div>;
}
