import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { organizationMemberships, organizations, users } from "@/infrastructure/database/schema/identity";
import type { Membership } from "./types";

export async function findMembership(userId: string, organizationId: string): Promise<Membership | null> {
  const [row] = await getDatabase().select({
    id: organizationMemberships.id, organizationId: organizationMemberships.organizationId,
    organizationName: organizations.name, userId: organizationMemberships.userId,
    role: organizationMemberships.role, active: organizationMemberships.active,
  }).from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function listCreatorOrganizations(userId: string) {
  return getDatabase().select({ id: organizations.id, name: organizations.name })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.active, true), inArray(organizationMemberships.role, ["owner", "organizer"])));
}

export async function listAssignableStaff(organizationId: string) {
  return getDatabase().select({
    id: organizationMemberships.id, name: users.displayName,
    role: organizationMemberships.role, avatar: users.avatarUrl,
  }).from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(and(eq(organizationMemberships.organizationId, organizationId), eq(organizationMemberships.active, true), inArray(organizationMemberships.role, ["staff", "organizer"])));
}
