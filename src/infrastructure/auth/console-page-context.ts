import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, type AuthenticatedUser } from "./current-user";
import { requireClerkSession } from "./require-session";
import { resolveConsoleAccess } from "@/modules/organizations/console-access";
import * as organizations from "@/modules/organizations/repository";
import type { ConsoleContext } from "@/modules/organizations/types";
import type { OrganizationRole } from "@/modules/organizations/types";
import { getCreateEventContext } from "@/modules/organizations/service";
import { ApplicationError } from "@/shared/lib/application-error";

const selectionCookie = "weft_organization_id";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OrganizationSelection = { userId: string; organizationId: string };

export function parseOrganizationSelection(value: string | undefined): OrganizationSelection | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (typeof parsed.userId !== "string" || typeof parsed.organizationId !== "string" ||
      !uuidPattern.test(parsed.userId) || !uuidPattern.test(parsed.organizationId)) return null;
    return { userId: parsed.userId, organizationId: parsed.organizationId };
  } catch {
    return null;
  }
}

async function requireLocalActor(): Promise<AuthenticatedUser> {
  await requireClerkSession();
  try {
    const user = await getCurrentUser();
    if (user) return user;
    await requireClerkSession();
    redirect("/sign-in");
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") redirect("/access-required");
    throw error;
  }
}

export async function listActorMemberships(user: AuthenticatedUser) {
  return organizations.listActiveMemberships(user.id);
}

export async function getCreateEventPageContexts(user: AuthenticatedUser) {
  const memberships = await listActorMemberships(user);
  const eligible = memberships.filter((membership) => membership.role === "owner" || membership.role === "organizer");
  const cookieStore = await cookies();
  const raw = cookieStore.get(selectionCookie)?.value;
  const selected = parseOrganizationSelection(raw);
  const selectedMembership = selected?.userId === user.id
    ? eligible.find((membership) => membership.organizationId === selected.organizationId)
    : undefined;
  if (raw && (!selected || selected.userId !== user.id || !selectedMembership)) cookieStore.delete(selectionCookie);
  const displayMembership = selectedMembership ?? eligible[0];
  if (!displayMembership) return { formContext: await getCreateEventContext(user), consoleContext: null, selectedOrganizationId: undefined };
  const formContext = await getCreateEventContext(user);
  return {
    formContext,
    selectedOrganizationId: displayMembership.organizationId,
    consoleContext: {
      user,
      organization: { id: displayMembership.organizationId, name: displayMembership.organizationName ?? "" },
      membership: { id: displayMembership.id, role: displayMembership.role },
    } satisfies ConsoleContext,
  };
}

export async function requireOrganizerPageContext(options: { cleanupInvalidSelection?: boolean } = {}): Promise<ConsoleContext> {
  const user = await requireLocalActor();
  const cookieStore = await cookies();
  const rawSelection = cookieStore.get(selectionCookie)?.value;
  const parsed = parseOrganizationSelection(rawSelection);
  const selection = parsed?.userId === user.id ? parsed : null;
  if (options.cleanupInvalidSelection !== false && rawSelection && !selection) cookieStore.delete(selectionCookie);
  const memberships = await listActorMemberships(user);
  const result = resolveConsoleAccess({ memberships, selectedOrganizationId: selection?.organizationId ?? null, userId: user.id });
  if (result.kind === "no-access") redirect("/access-required");
  if (result.kind === "select") redirect("/select-organization");
  return {
    user,
    organization: { id: result.membership.organizationId, name: result.membership.organizationName ?? "" },
    membership: { id: result.membership.id, role: result.membership.role },
  };
}

export async function requireOrganizationContext(input: {
  user: AuthenticatedUser;
  organizationId: string;
  allowedRoles: OrganizationRole[];
}): Promise<ConsoleContext> {
  const membership = await organizations.findMembership(input.user.id, input.organizationId);
  if (!membership?.active || !input.allowedRoles.includes(membership.role)) {
    throw new ApplicationError("FORBIDDEN", "You do not have access to this organization.");
  }
  return {
    user: input.user,
    organization: { id: membership.organizationId, name: membership.organizationName ?? "" },
    membership: { id: membership.id, role: membership.role },
  };
}

export { requireLocalActor };
