/** Team invitations need migrations 0003/0004; enable per environment once they are applied. */
export function teamInvitationsEnabled() {
  return process.env.WEFT_TEAM_INVITATIONS === "enabled";
}
