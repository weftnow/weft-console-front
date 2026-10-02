import "server-only";
import type { AuthenticatedUser } from "@/infrastructure/auth/current-user";
import { ApplicationError } from "@/shared/lib/application-error";
import * as repository from "./repository";
import type { AuthorizedOrganization, CreateEventContext, Membership } from "./types";

type MembershipReader = Pick<typeof repository, "findMembership">;

export function canCreateEvent(membership: Pick<Membership, "active" | "role"> | null): boolean {
  return Boolean(membership?.active && (membership.role === "owner" || membership.role === "organizer"));
}

export function canAssignStaff(membership: Pick<Membership, "active" | "role"> | null): boolean {
  return Boolean(membership?.active && (membership.role === "staff" || membership.role === "organizer"));
}

export async function requireEventCreator(
  { userId, organizationId }: { userId: string; organizationId: string },
  reader: MembershipReader = repository,
): Promise<AuthorizedOrganization> {
  const membership = await reader.findMembership(userId, organizationId);
  if (!canCreateEvent(membership)) {
    throw new ApplicationError("FORBIDDEN", "You do not have access to this event or organization.");
  }
  return { id: organizationId, name: membership?.organizationName ?? "" };
}

export async function getCreateEventContext(
  actor: AuthenticatedUser,
  reader: Pick<typeof repository, "listCreatorOrganizations" | "listAssignableStaff"> = repository,
): Promise<CreateEventContext> {
  const allowed = await reader.listCreatorOrganizations(actor.id);
  const organizations = await Promise.all(allowed.map(async (organization) => ({
    ...organization,
    staff: (await reader.listAssignableStaff(organization.id)).map((member) => ({
      id: member.id, name: member.name, role: member.role, avatar: member.avatar ?? "",
    })),
  })));
  return { organizer: { name: actor.displayName, avatar: actor.avatarUrl }, organizations };
}
