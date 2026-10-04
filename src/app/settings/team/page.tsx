import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { listInvitations } from "@/modules/organizations/invitations/service";
import { TeamInvitations } from "@/modules/organizations/invitations/components/team-invitations";
import { ApplicationError } from "@/shared/lib/application-error";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const context = await requireOrganizerPageContext();
  if (context.membership.role !== "owner") throw new ApplicationError("FORBIDDEN", "Only organization owners can manage invitations.");
  const invitations = await listInvitations({ userId: context.user.id, organizationId: context.organization.id });
  return <div className="overview-shell"><div className="dashboard-layout">
    <ConsoleSidebar active="team" context={context} />
    <main className="dashboard-main">
      <header className="events-header"><div className="events-header__copy">
        <p className="events-header__subtitle">{context.organization.name}</p>
        <h1 className="events-header__title">Team</h1>
        <p className="events-header__subtitle">Invite owners and organizers to work in this organization.</p>
      </div></header>
      <div className="content-stack"><TeamInvitations invitations={invitations} /></div>
    </main>
  </div></div>;
}
