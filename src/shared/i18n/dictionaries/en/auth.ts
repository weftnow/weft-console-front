export const auth = {
  eventsUnavailable: {
    title: "Events unavailable",
    description: "Your events could not be loaded. Please try again.",
  },
  eventUnavailable: {
    title: "Event unavailable",
    description: "The event could not be loaded. Please try again.",
  },
  joinOrganization: {
    title: "Join your organization",
    description: "Sign in with the account that received this invitation, or create your account to continue.",
  },
  accessRequired: {
    title: "Console access required",
    description: "Your account does not have an organization setup this Console can open.",
    refresh: "Refresh account session",
  },
  selectOrganization: {
    noAccessDescription: "Your account does not have an organization or event this Console can open.",
    chooseTitle: "Choose your workspace",
    eventsTitle: "Your events",
    chooseDescription: "Choose an organization or event to continue.",
    eventsDescription: "Open an event you have access to.",
    eventAccess: "Your event access",
    rosterAccess: "Roster access",
    wefter: "Wefter",
  },
  onboarding: {
    title: "Finish invitation setup",
    description: "We’ll verify accepted invitations before opening an organization.",
  },
} as const;
