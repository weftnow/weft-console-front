import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { findClerkUser } from "./identity-repository";
import { resolveCurrentUser } from "./resolve-current-user";

/** A local application user resolved from a verified server-side session. */
export type AuthenticatedUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => resolveCurrentUser({
  readSession: async () => {
    const session = await auth();
    return session.userId && session.sessionStatus === "active" ? { subject: session.userId } : null;
  },
  instanceId: process.env.WEFT_CLERK_INSTANCE_ID,
  findUser: findClerkUser,
}));
