import type { CustomerRequest } from "./validation";

export type { CustomerRequest };
export type ProvisioningStatus = "pending" | "consumed" | "cancelled";
export type OrganizationTransportState = "queued" | "sending" | "ready" | "unknown" | "failed";
export type OwnerInvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type OwnerDeliveryState = "queued" | "sending" | "sent" | "unknown" | "failed";

export type CustomerProvisioningRecord = {
  requestId: string;
  organizationId: string;
  instanceId: string;
  organizationName: string;
  ownerEmail: string;
  intendedRole: "owner";
  operator: string;
  status: ProvisioningStatus;
  organizationTransportState: OrganizationTransportState;
  organizationLeaseUntil: Date | null;
  organizationLeaseGeneration: number;
  organizationErrorCode: string | null;
  createdAt: Date;
  consumedAt: Date | null;
  consumedSubject: string | null;
  consumedUserId: string | null;
};

export type OwnerInvitationRecord = {
  id: string;
  requestId: string;
  instanceId: string;
  providerInvitationId: string | null;
  status: OwnerInvitationStatus;
  deliveryState: OwnerDeliveryState;
  deliveryLeaseUntil: Date | null;
  deliveryLeaseGeneration: number;
  deliveryErrorCode: string | null;
  providerCleanupPending: boolean;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedSubject: string | null;
  acceptedUserId: string | null;
};

export type ReservedCustomer = { provisioning: CustomerProvisioningRecord; invitation: OwnerInvitationRecord; created: boolean };
export type CustomerRequestInput = CustomerRequest;
