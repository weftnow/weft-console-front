"use client";

import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearOrganizationSelectionCookie, switchOrganization } from "@/app/account/actions";
import { ChevronDownIcon } from "./icons";

export function ConsoleAccount({ user, organization }: {
  user: { id: string; displayName: string };
  organization: { name: string; role: string };
}) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const menu = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const placeMenu = useCallback(() => {
    if (!menu.current?.matches(":popover-open") || !trigger.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const height = menu.current.getBoundingClientRect().height;
    menu.current.style.left = `${Math.max(12, Math.min(anchor.right - 190, window.innerWidth - 202))}px`;
    menu.current.style.top = `${anchor.bottom + height + 8 < window.innerHeight - 12 ? anchor.bottom + 8 : Math.max(12, anchor.top - height - 8)}px`;
  }, []);
  useEffect(() => { router.refresh(); }, [clerkUser?.id, router]);
  useEffect(() => {
    window.addEventListener("resize", placeMenu);
    document.addEventListener("scroll", placeMenu, true);
    return () => { window.removeEventListener("resize", placeMenu); document.removeEventListener("scroll", placeMenu, true); };
  }, [placeMenu]);

  return <div className="profile">
    <div className="profile__identity">
      <div className="profile__avatar"><UserButton /></div>
      <div className="profile__text">
        <span className="profile__name" title={user.displayName}>{user.displayName}</span>
        <span className="profile__role">{organization.role}</span>
      </div>
      <div className="profile-menu">
      <button className="profile-menu__trigger" aria-label="Account options" popoverTarget={menuId} ref={trigger} type="button"><ChevronDownIcon height="16" width="16" /></button>
      <nav id={menuId} popover="auto" ref={menu} onToggle={placeMenu} className="profile-menu__content surface-floating" aria-label="Account">
      {organization.role === "owner" ? <Link href="/settings/team">Manage team</Link> : null}
      <Link href="/onboarding">Accept invitation</Link>
      <form action={switchOrganization}><button type="submit">Switch organization</button></form>
      <button onClick={async () => {
        await clearOrganizationSelectionCookie();
        await clerk.signOut({ redirectUrl: "/sign-in" });
      }} type="button">Sign out</button>
      </nav>
      </div>
    </div>
  </div>;
}
