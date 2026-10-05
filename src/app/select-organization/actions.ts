"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { listActiveMemberships } from "@/modules/organizations/repository";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function selectOrganization(formData: FormData): Promise<void> {
  const actor = await requireLocalActor();
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !uuidPattern.test(organizationId)) redirect("/select-organization");
  const memberships = await listActiveMemberships(actor.id);
  if (!memberships.some((membership) => membership.organizationId === organizationId && (membership.role === "owner" || membership.role === "organizer"))) {
    redirect("/access-required");
  }
  (await cookies()).set("weft_organization_id", JSON.stringify({ userId: actor.id, organizationId }), {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}
