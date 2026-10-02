import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { userAuthIdentities, users } from "@/infrastructure/database/schema/identity";
import type { AuthenticatedUser } from "./current-user";

export async function findClerkUser(input: { instanceId: string; subject: string }): Promise<AuthenticatedUser | null> {
  const [row] = await getDatabase().select({
    id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl,
  }).from(userAuthIdentities)
    .innerJoin(users, eq(users.id, userAuthIdentities.userId))
    .where(and(
      eq(userAuthIdentities.provider, "clerk"),
      eq(userAuthIdentities.instanceId, input.instanceId),
      eq(userAuthIdentities.subject, input.subject),
      isNull(userAuthIdentities.disabledAt),
    )).limit(1);
  return row ?? null;
}
