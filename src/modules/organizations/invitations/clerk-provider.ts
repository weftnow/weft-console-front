import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { createClerkInvitationProvider, type ProviderClient } from "./clerk-transport";

export { ProviderTransportError, createClerkInvitationProvider } from "./clerk-transport";

export function getInvitationProvider() {
  return clerkClient().then((client) => createClerkInvitationProvider(client as unknown as ProviderClient));
}
