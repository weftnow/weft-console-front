export type OrganizationRole = "owner" | "organizer" | "staff" | "sponsor";

export type Membership = {
  id: string;
  organizationId: string;
  organizationName?: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
};

export type AuthorizedOrganization = { id: string; name: string };
export type AssignableStaff = { id: string; name: string; role: string; avatar: string };
export type CreateEventOrganization = AuthorizedOrganization & { staff: AssignableStaff[] };
export type CreateEventContext = { organizer: { name: string; avatar: string | null }; organizations: CreateEventOrganization[] };
