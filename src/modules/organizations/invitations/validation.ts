import { z } from "zod";

export const invitationIdSchema = z.uuid();
export const invitedRoleSchema = z.enum(["owner", "organizer"]);
export const invitationInputSchema = z.strictObject({
  email: z.string().trim().max(254).email().transform((email) => email.toLowerCase()),
  role: invitedRoleSchema,
});

export type InvitedRole = z.infer<typeof invitedRoleSchema>;

export function parseInvitationInput(value: unknown): { email: string; role: InvitedRole } {
  return invitationInputSchema.parse(value);
}

export function matchesInvitationEmail(email: string, verifiedEmails: string[]): boolean {
  const normalized = email.trim().toLowerCase();
  return verifiedEmails.some((verified) => verified.trim().toLowerCase() === normalized);
}
