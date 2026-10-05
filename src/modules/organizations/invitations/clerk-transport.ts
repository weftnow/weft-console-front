import type { ProviderAcceptance, ProviderInvitation } from "./types";

export type ProviderClient = {
  organizations: {
    getOrganizationList?(input: { limit: number; offset: number }): Promise<{ data: ClerkOrganization[]; totalCount: number }>;
    createOrganization?(input: { name: string; publicMetadata: Record<string, unknown> }): Promise<ClerkOrganization>;
    createOrganizationInvitation(input: Record<string, unknown>): Promise<ClerkInvitation>;
    getOrganizationInvitationList(input: { organizationId: string; limit: number; offset: number; status?: string[] }): Promise<{ data: ClerkInvitation[]; totalCount: number }>;
    revokeOrganizationInvitation(input: { organizationId: string; invitationId: string }): Promise<unknown>;
    getOrganizationMembershipList(input: { organizationId: string; userId: string[]; limit: number; offset: number }): Promise<{ data: ClerkMembership[]; totalCount: number }>;
  };
  users: {
    getUser(userId: string): Promise<ClerkUser>;
    getUserList(input: { emailAddress: string[]; limit: number; offset: number }): Promise<{ data: ClerkUser[]; totalCount: number }>;
  };
};
export type ClerkOrganization = { id: string; name: string; publicMetadata?: Record<string, unknown> | null };
type ClerkInvitation = {
  id: string; organizationId: string; emailAddress: string; status?: string;
  publicMetadata?: Record<string, unknown>; createdAt: number;
};
type ClerkMembership = {
  id: string; createdAt: number; organization: { id: string }; publicMetadata?: Record<string, unknown>;
  publicUserData?: { userId?: string | null } | null;
};
type ClerkUser = {
  id: string; fullName: string | null; imageUrl: string | null;
  emailAddresses: Array<{ emailAddress: string; verification?: { status?: string | null } | null }>;
};

export class ProviderTransportError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly outcomeUnknown: boolean;
  constructor(code: string, retryable: boolean, outcomeUnknown: boolean) {
    super(code);
    this.code = code;
    this.retryable = retryable;
    this.outcomeUnknown = outcomeUnknown;
    this.name = "ProviderTransportError";
  }
}

export function sanitizeProviderError(error: unknown): ProviderTransportError {
  const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
  if (status === 429) return new ProviderTransportError("provider_rate_limited", true, false);
  if (status >= 500) return new ProviderTransportError("provider_unavailable", true, true);
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return new ProviderTransportError("provider_timeout", true, true);
  }
  if (status >= 400) return new ProviderTransportError("provider_rejected", false, false);
  return new ProviderTransportError("provider_error", false, true);
}

async function allInvitations(client: ProviderClient, organizationSubject: string): Promise<ClerkInvitation[]> {
  const all: ClerkInvitation[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await client.organizations.getOrganizationInvitationList({
      organizationId: organizationSubject, limit: 100, offset,
      status: ["pending", "accepted", "revoked", "expired"],
    });
    all.push(...page.data);
    total = page.totalCount;
    if (page.data.length === 0) break;
    offset += 100;
  }
  return all;
}

function toProviderInvitation(invitation: ClerkInvitation): ProviderInvitation {
  const status = ["pending", "accepted", "revoked", "expired"].includes(invitation.status ?? "")
    ? invitation.status as ProviderInvitation["status"] : "pending";
  return {
    id: invitation.id, organizationSubject: invitation.organizationId, email: invitation.emailAddress,
    correlationId: typeof invitation.publicMetadata?.weftInvitationId === "string" ? invitation.publicMetadata.weftInvitationId : null,
    status,
  };
}

export function createClerkInvitationProvider(client: ProviderClient) {
  return {
    async findOrganization(localOrganizationId: string): Promise<{ id: string } | null> {
      try {
        if (!client.organizations.getOrganizationList) throw new Error("provider_error");
        const all: ClerkOrganization[] = [];
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;
        while (offset < total) {
          const page = await client.organizations.getOrganizationList({ limit: 100, offset });
          all.push(...page.data);
          total = page.totalCount;
          if (page.data.length === 0) break;
          offset += 100;
        }
        const matches = all.filter((organization) => organization.publicMetadata?.weftOrganizationId === localOrganizationId);
        if (matches.length > 1) throw new ProviderTransportError("provider_ambiguous", false, true);
        return matches.length ? { id: matches[0].id } : null;
      } catch (error) {
        if (error instanceof ProviderTransportError) throw error;
        throw sanitizeProviderError(error);
      }
    },
    async createOrganization(input: { name: string; localOrganizationId: string }): Promise<{ id: string }> {
      try {
        if (!client.organizations.createOrganization) throw new Error("provider_error");
        const organization = await client.organizations.createOrganization({
          name: input.name, publicMetadata: { weftOrganizationId: input.localOrganizationId },
        });
        if (organization.publicMetadata?.weftOrganizationId !== input.localOrganizationId) {
          throw new ProviderTransportError("provider_correlation_missing", false, true);
        }
        return { id: organization.id };
      } catch (error) {
        if (error instanceof ProviderTransportError) throw error;
        throw sanitizeProviderError(error);
      }
    },
    async send(input: { organizationSubject: string; email: string; correlationId: string; redirectUrl: string }): Promise<ProviderInvitation> {
      try {
        const result = await client.organizations.createOrganizationInvitation({
          organizationId: input.organizationSubject, emailAddress: input.email,
          role: "org:member", expiresInDays: 7,
          publicMetadata: { weftInvitationId: input.correlationId }, redirectUrl: input.redirectUrl,
        });
        return toProviderInvitation(result);
      } catch (error) { throw sanitizeProviderError(error); }
    },
    async findByCorrelation(organizationSubject: string, correlationId: string): Promise<ProviderInvitation | null> {
      try {
        const matches = (await allInvitations(client, organizationSubject)).filter((item) => item.publicMetadata?.weftInvitationId === correlationId);
        if (matches.length > 1) throw new ProviderTransportError("provider_ambiguous", false, true);
        return matches.length ? toProviderInvitation(matches[0]) : null;
      } catch (error) {
        if (error instanceof ProviderTransportError) throw error;
        throw sanitizeProviderError(error);
      }
    },
    async revoke(organizationSubject: string, invitationId: string): Promise<void> {
      try { await client.organizations.revokeOrganizationInvitation({ organizationId: organizationSubject, invitationId }); }
      catch (error) { throw sanitizeProviderError(error); }
    },
    async readAcceptance(organizationSubject: string, subject: string, correlationId: string): Promise<ProviderAcceptance | null> {
      try {
        const invitations = await allInvitations(client, organizationSubject);
        const matches = invitations.filter((item) => item.organizationId === organizationSubject &&
          item.publicMetadata?.weftInvitationId === correlationId && item.status === "accepted");
        if (matches.length > 1) throw new ProviderTransportError("provider_ambiguous", false, true);
        const invitation = matches[0];
        if (!invitation) return null;
        const page = await client.organizations.getOrganizationMembershipList({ organizationId: organizationSubject, userId: [subject], limit: 100, offset: 0 });
        const membership = page.data.find((item) => item.publicUserData?.userId === subject && item.organization.id === organizationSubject &&
          item.publicMetadata?.weftInvitationId === correlationId);
        if (!membership || membership.createdAt < invitation.createdAt) return null;
        const user = await client.users.getUser(subject);
        const verifiedEmails = user.emailAddresses.filter((email) => email.verification?.status === "verified").map((email) => email.emailAddress);
        return {
          subject, organizationSubject, membershipId: membership.id,
          correlationId, invitationEmail: invitation.emailAddress, acceptedAt: new Date(membership.createdAt), verifiedEmails,
          displayName: user.fullName?.trim() ?? "", avatarUrl: user.imageUrl,
        };
      } catch (error) {
        if (error instanceof ProviderTransportError) throw error;
        throw sanitizeProviderError(error);
      }
    },
    async findSubjectByVerifiedEmail(email: string): Promise<string | null> {
      try {
        const page = await client.users.getUserList({ emailAddress: [email], limit: 100, offset: 0 });
        const user = page.data.find((candidate) => candidate.emailAddresses.some((address) =>
          address.emailAddress.trim().toLowerCase() === email.trim().toLowerCase() && address.verification?.status === "verified"));
        return user?.id ?? null;
      } catch (error) { throw sanitizeProviderError(error); }
    },
    async findVerifiedEmails(subject: string): Promise<string[]> {
      try {
        const user = await client.users.getUser(subject);
        return user.emailAddresses.filter((email) => email.verification?.status === "verified").map((email) => email.emailAddress);
      } catch (error) { throw sanitizeProviderError(error); }
    },
  };
}
