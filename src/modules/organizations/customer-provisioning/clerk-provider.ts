import { createClerkInvitationProvider, type ProviderClient } from "../invitations/clerk-transport.ts";

type InvitationTransport = ReturnType<typeof createClerkInvitationProvider>;

export function createCustomerProvisioningProvider(client: ProviderClient & { createInvitationProvider?: InvitationTransport }) {
  const invitations = client.createInvitationProvider ?? createClerkInvitationProvider(client);
  return {
    async findOrganization(localOrganizationId: string) {
      return invitations.findOrganization(localOrganizationId);
    },
    async createOrganization(input: { name: string; localOrganizationId: string }) {
      return invitations.createOrganization(input);
    },
    async send(input: { organizationSubject: string; email: string; correlationId: string; redirectUrl: string }) {
      return invitations.send(input);
    },
    async findByCorrelation(organizationSubject: string, correlationId: string) {
      return invitations.findByCorrelation(organizationSubject, correlationId);
    },
    async revoke(organizationSubject: string, invitationId: string) {
      return invitations.revoke(organizationSubject, invitationId);
    },
    async readAcceptance(organizationSubject: string, subject: string, correlationId: string) {
      return invitations.readAcceptance(organizationSubject, subject, correlationId);
    },
    async findVerifiedEmails(subject: string) {
      return invitations.findVerifiedEmails(subject);
    },
  };
}
