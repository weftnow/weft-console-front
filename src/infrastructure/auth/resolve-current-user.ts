import { ApplicationError } from "@/shared/lib/application-error";
import type { AuthenticatedUser } from "./current-user";

export type ClerkSession = { subject: string };
export type ClerkUserLookup = (input: { instanceId: string; subject: string }) => Promise<AuthenticatedUser | null>;

export async function resolveCurrentUser(deps: {
  readSession: () => Promise<ClerkSession | null>;
  instanceId: string | undefined;
  findUser: ClerkUserLookup;
}): Promise<AuthenticatedUser | null> {
  const session = await deps.readSession();
  if (!session) return null;
  if (!deps.instanceId?.trim()) throw new Error("WEFT_CLERK_INSTANCE_ID is required.");
  const user = await deps.findUser({ instanceId: deps.instanceId, subject: session.subject });
  if (!user) throw new ApplicationError("FORBIDDEN", "This account has not been provisioned for the Weft Console.");
  return user;
}
