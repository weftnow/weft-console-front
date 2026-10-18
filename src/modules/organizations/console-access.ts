import type { Membership } from "./types";

export type ConsoleAccessResult =
  | { kind: "ready"; membership: Membership }
  | { kind: "select" }
  | { kind: "no-access" };

export function resolveConsoleAccess(input: {
  memberships: Membership[];
  selectedOrganizationId: string | null;
  userId?: string;
}): ConsoleAccessResult {
  const active = input.memberships.filter((membership) =>
    membership.active && (!input.userId || membership.userId === input.userId),
  );
  const eligible = active.filter((membership) => membership.role === "owner" || membership.role === "organizer");
  if (input.selectedOrganizationId) {
    const selected = active.find((membership) => membership.organizationId === input.selectedOrganizationId);
    if (!selected) return eligible.length > 0 ? { kind: "select" } : { kind: "no-access" };
    return selected.role === "owner" || selected.role === "organizer"
      ? { kind: "ready", membership: selected }
      : eligible.length > 0 ? { kind: "select" } : { kind: "no-access" };
  }
  if (eligible.length === 1 && active.length === 1) return { kind: "ready", membership: eligible[0] };
  if (eligible.length > 0) return { kind: "select" };
  return { kind: "no-access" };
}
