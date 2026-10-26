import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
import { userAuthIdentities, users } from "@/infrastructure/database/schema/identity";
import { DEFAULT_LOCALE, hasLocale, type Locale } from "@/shared/i18n/locales";
import type { AuthenticatedUser } from "./current-user";

export async function findClerkUser(input: { instanceId: string; subject: string }): Promise<AuthenticatedUser | null> {
  const [row] = await getDatabase().select({
    id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl, locale: users.locale,
  }).from(userAuthIdentities)
    .innerJoin(users, eq(users.id, userAuthIdentities.userId))
    .where(and(
      eq(userAuthIdentities.provider, "clerk"),
      eq(userAuthIdentities.instanceId, input.instanceId),
      eq(userAuthIdentities.subject, input.subject),
      isNull(userAuthIdentities.disabledAt),
    )).limit(1);
  return row ? { ...row, locale: hasLocale(row.locale) ? row.locale : DEFAULT_LOCALE } : null;
}

/** Update only the given user's own saved locale. */
export async function updateUserLocale(userId: string, locale: Locale): Promise<void> {
  await getDatabase().update(users).set({ locale, updatedAt: new Date() }).where(eq(users.id, userId));
}
