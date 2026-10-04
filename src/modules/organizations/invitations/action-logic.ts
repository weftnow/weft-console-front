import { invitationIdSchema } from "./validation";
import type { CompletionResult } from "./types";

export type FinishInvitationState = { kind: "complete" | "unavailable" | "wrong-account" | "conflict" | "retry" };

export async function finishInvitationWith(
  invitationId: unknown,
  session: { subject: string | null; sessionStatus: string },
  deps: {
    instanceId?: string;
    completeInvitation: (input: { instanceId: string; subject: string; invitationId: string }) => Promise<CompletionResult>;
    setOrganizationSelection: (selection: { userId: string; organizationId: string }) => Promise<void>;
  },
): Promise<FinishInvitationState> {
  const parsedId = invitationIdSchema.safeParse(invitationId);
  if (!parsedId.success || !session.subject || session.sessionStatus !== "active" || !deps.instanceId?.trim()) return { kind: "unavailable" };
  try {
    const result = await deps.completeInvitation({ instanceId: deps.instanceId, subject: session.subject, invitationId: parsedId.data });
    if (result.kind !== "complete") return { kind: result.kind };
    await deps.setOrganizationSelection({ userId: result.userId, organizationId: result.organizationId });
    return { kind: "complete" };
  } catch {
    return { kind: "retry" };
  }
}
