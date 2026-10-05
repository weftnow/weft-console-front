import type { InvitedRole } from "./validation";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type DeliveryState = "queued" | "sending" | "sent" | "unknown" | "failed";

export type InvitationRecord = {
  id: string;
  organizationId: string;
  instanceId: string;
  email: string;
  role: InvitedRole;
  inviterUserId: string;
  providerInvitationId: string | null;
  status: InvitationStatus;
  deliveryState: DeliveryState;
  deliveryLeaseUntil: Date | null;
  deliveryErrorCode: string | null;
  providerCleanupPending: boolean;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedSubject: string | null;
  acceptedUserId: string | null;
};

export type InvitationView = Pick<InvitationRecord,
  "id" | "email" | "role" | "status" | "deliveryState" | "providerCleanupPending"> & {
  createdAt: string;
  expiresAt: string;
};

export type ProviderInvitation = {
  id: string;
  organizationSubject: string;
  email: string;
  correlationId: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export type ProviderAcceptance = {
  subject: string;
  organizationSubject: string;
  membershipId: string;
  correlationId: string;
  invitationEmail: string;
  acceptedAt: Date;
  verifiedEmails: string[];
  displayName: string;
  avatarUrl: string | null;
};

export type InvitationAdminActor = { userId: string; organizationId: string };
export type CompletionResult =
  | { kind: "complete"; userId: string; organizationId: string }
  | { kind: "unavailable" | "wrong-account" | "conflict" | "retry" };
