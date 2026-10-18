import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { listActiveMemberships } from "@/modules/organizations/repository";
import { listGrantedEventsForUser } from "@/modules/events/server/access-repository";
import Link from "next/link";
import { selectOrganization } from "./actions";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function SelectOrganizationPage() {
  const user = await requireLocalActor();
  const organizations = (await listActiveMemberships(user.id)).filter((membership) =>
    membership.role === "owner" || membership.role === "organizer",
  );
  const grantedEvents = await listGrantedEventsForUser(user.id);
  if (!organizations.length && !grantedEvents.length) return <AuthShell title="Console access required" description="Your account does not have an organization or event this Console can open.">{null}</AuthShell>;
  return <AuthShell title="Choose an organization" description="Select the organization you want to work in.">
    {organizations.length ? <form action={selectOrganization} className="mt-6 grid gap-3">
      {organizations.map((organization) => <button
        className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        key={organization.id} name="organizationId" value={organization.organizationId} type="submit"
      >{organization.organizationName}</button>)}
    </form> : null}
    {grantedEvents.length ? <section className="mt-8 grid gap-3" aria-labelledby="granted-events-heading">
      <h2 className="text-sm font-semibold" id="granted-events-heading">Your event access</h2>
      {grantedEvents.map((event) => <Link className="rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/${event.accessMode}/${event.eventId}`} key={event.eventId}>
        <strong>{event.eventName}</strong><span className="ml-2 text-muted-foreground">{event.accessMode === "operator" ? "Operator" : "Wefter"}</span>
      </Link>)}
    </section> : null}
  </AuthShell>;
}
