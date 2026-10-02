import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { listActiveMemberships } from "@/modules/organizations/repository";
import { selectOrganization } from "./actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SelectOrganizationPage() {
  await requireClerkSession();
  const user = await requireLocalActor();
  const memberships = await listActiveMemberships(user.id);
  const eligible = memberships.filter((membership) => membership.role === "owner" || membership.role === "organizer");
  if (!eligible.length) redirect("/access-required");
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
    <h1 className="text-3xl font-semibold">Choose an organization</h1>
    <p className="mt-3 text-muted-foreground">Select an organization you are authorized to manage.</p>
    <div className="mt-8 space-y-3">
      {eligible.map((membership) => <form action={selectOrganization} key={membership.id}>
        <input type="hidden" name="organizationId" value={membership.organizationId} />
        <button className="w-full rounded-xl border px-5 py-4 text-left hover:bg-muted" type="submit">
          <span className="block font-medium">{membership.organizationName}</span>
          <span className="mt-1 block text-sm capitalize text-muted-foreground">{membership.role}</span>
        </button>
      </form>)}
    </div>
  </main>;
}
