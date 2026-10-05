"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ConsoleAccount({ user, organization }: {
  user: { id: string; displayName: string };
  organization: { name: string; role: string };
}) {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  useEffect(() => { router.refresh(); }, [clerkUser?.id, router]);

  return <div className="profile">
    <div className="profile__identity">
      <div className="profile__avatar"><UserButton /></div>
      <div className="profile__text">
        <span className="profile__name" title={user.displayName}>{user.displayName}</span>
        <span className="profile__role">{organization.role}</span>
      </div>
    </div>
  </div>;
}
