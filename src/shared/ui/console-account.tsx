"use client";

import { UserButton, useClerk, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearOrganizationSelectionCookie, switchOrganization } from "@/app/account/actions";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ChevronDownIcon } from "./icons";
import { LocaleSwitcher } from "./locale-switcher";

export function ConsoleAccount({ user, organization }: {
  user: { id: string; displayName: string };
  organization: { name: string; role: string };
}) {
  const { dict } = useI18n();
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
        <span className="profile__role">{dict.common.roles[organization.role as keyof typeof dict.common.roles] ?? organization.role}</span>
      </div>
      <div className="profile-menu">
      <button className="profile-menu__trigger" aria-label={dict.common.account.options} popoverTarget={menuId} ref={trigger} type="button"><ChevronDownIcon height="16" width="16" /></button>
      <nav id={menuId} popover="auto" ref={menu} onToggle={placeMenu} className="profile-menu__content surface-floating" aria-label={dict.common.account.label}>
      {organization.role === "owner" ? <Link href="/settings/team">{dict.common.account.manageTeam}</Link> : null}
      <Link href="/onboarding">{dict.common.account.acceptInvitation}</Link>
      <LocaleSwitcher />
      <form action={switchOrganization}><button type="submit">{dict.common.account.switchOrganization}</button></form>
      <button onClick={async () => {
        await clearOrganizationSelectionCookie();
        await clerk.signOut({ redirectUrl: "/sign-in" });
      }} type="button">{dict.common.account.signOut}</button>
      </nav>
      </div>
    </div>
  </div>;
}
