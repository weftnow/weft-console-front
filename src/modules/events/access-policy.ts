export type LocalEventAccessInput = {
  membership: { active: boolean; role: "owner" | "organizer" | "staff" | "sponsor" } | null;
  accessMode: "operator" | "wefter" | null;
};

export type EventOperation = "list" | "detail" | "cover" | "roster" | "import" | "manage-access" | "team";

export function canAccessEvent(input: LocalEventAccessInput, operation: EventOperation): boolean {
  const membership = input.membership;
  if (!membership?.active) return false;
  if (membership.role === "owner" || membership.role === "organizer") return true;
  if (membership.role !== "staff" || !input.accessMode) return false;
  if (input.accessMode === "operator") return ["list", "detail", "cover", "roster"].includes(operation);
  return operation === "list";
}
