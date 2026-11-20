export type OutcomesReport = {
  eventOptions: { eventId: string; eventName: string }[];
  events: {
    eventId: string;
    eventName: string;
    startsAt: string;
    timezone: string;
    trackingStartedAt: string | null;
    completedIntroductions: number;
    peopleIntroduced: number;
  }[];
  totals: { completedIntroductions: number; trackedEvents: number; totalEvents: number };
  selectedEventId: string | null;
};

export type MatchCompletion = {
  trackingStartedAt: string | null;
  completedAt: string | null;
  revision: number;
};
