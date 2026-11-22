export type OutcomesDay = { date: string; count: number };

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
  recordedByDay: OutcomesDay[];
  selectedEventId: string | null;
  simulated?: true;
};

export type MatchCompletion = {
  trackingStartedAt: string | null;
  completedAt: string | null;
  revision: number;
  simulated?: true;
};
