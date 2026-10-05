import { redirect } from "next/navigation";
import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { listActiveMemberships } from "@/modules/organizations/repository";
import { AuthShell } from "@/shared/ui/auth-shell";
import { selectOrganization } from "./actions";

export const dynamic = "force-dynamic";

export default async function SelectOrganizationPage() {
  await requireClerkSession();
  const user = await requireLocalActor();
  const memberships = await listActiveMemberships(user.id);
  const eligible = memberships.filter((membership) => membership.role === "owner" || membership.role === "organizer");
  if (!eligible.length) redirect("/access-required");
  return <AuthShell title="Choose an organization" description="Select an organization you are authorized to manage.">
    <ul className="mt-6 space-y-2">{eligible.map((membership) => <li key={membership.id}>
      <form action={selectOrganization}>
        <input type="hidden" name="organizationId" value={membership.organizationId} />
        <button className="w-full rounded-lg border border-border px-4 py-3 text-left text-sm" type="submit">
          <span className="block font-medium">{membership.organizationName}</span>
          <span className="mt-1 block capitalize text-muted-foreground">{membership.role}</span>
        </button>
      </form>
    </li>)}</ul>
  </AuthShell>;
}
