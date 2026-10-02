import "server-only";

/** A local application user resolved from a verified server-side session. */
export type AuthenticatedUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Integration point for a future authentication adapter. Until a real session
 * verifier maps a provider identity to an existing local user, fail closed.
 * Request bodies, headers and query parameters must never supply this actor.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  return null;
}
