"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { listActiveMemberships } from "@/modules/organizations/repository";

const selectionCookie = "weft_organization_id";

export async function selectOrganization(formData: FormData): Promise<void> {
  const user = await requireLocalActor();
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string") redirect("/access-required");
  const membership = (await listActiveMemberships(user.id)).find((item) =>
    item.organizationId === organizationId && (item.role === "owner" || item.role === "organizer"),
  );
  if (!membership) redirect("/select-organization");
  (await cookies()).set(selectionCookie, JSON.stringify({ userId: user.id, organizationId }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/",
  });
  redirect("/");
}
