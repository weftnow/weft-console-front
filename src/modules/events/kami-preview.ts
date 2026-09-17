import { deriveEventMetrics, type EventRecord } from "./event-record";
import { isContextEnabled, type KamiConfig, type KamiTone } from "./kami-config";

export interface KamiContextItem {
  available: boolean;
  detail: string;
  id: string;
  label: string;
}

export interface KamiPreviewPerson {
  avatar: string;
  company: string;
  name: string;
  role: string;
}

export interface KamiPreviewScenario {
  /** Longer background, used when the guest asks to hear more. */
  detail: string;
  guestMessage: string;
  id: string;
  label: string;
  reason: string;
  replies: string[];
  suggestion: KamiPreviewPerson;
}

export interface KamiPreviewMessage {
  author: "kami" | "guest";
  id: string;
  lines: string[];
  time: string;
}

/**
 * What Kami already knows about the room. These mirror the Create Event flow,
 * so an organizer can see which parts of their event carried through.
 */
export function deriveKamiContext(event: EventRecord): KamiContextItem[] {
  const metrics = deriveEventMetrics(event);
  const profiled = event.attendees.guests.filter((guest) => guest.profileType).length;
  const flagged = metrics.vips + metrics.sponsors;

  return [
    {
      available: Boolean(event.description),
      detail: event.description ? "From the event details" : "Not added yet",
      id: "description",
      label: "Event description",
    },
    {
      available: event.categories.length > 0,
      detail: event.categories.length
        ? `${event.categories.length} selected`
        : "Not added yet",
      id: "categories",
      label: "Event categories",
    },
    {
      available: event.expectedAudience.length > 0,
      detail: event.expectedAudience.length
        ? `${event.expectedAudience.length} profiles`
        : "Not added yet",
      id: "audience",
      label: "Expected audience",
    },
    {
      available: metrics.attendees > 0,
      detail: metrics.attendees
        ? `${metrics.attendees.toLocaleString()} imported`
        : "No attendees yet",
      id: "attendees",
      label: "Attendee profiles",
    },
    {
      available: profiled > 0 || metrics.attendees > 0,
      detail: profiled
        ? `${profiled.toLocaleString()} with a profile type`
        : metrics.attendees
          ? "Collected in the Weft app"
          : "No attendees yet",
      id: "goals",
      label: "Attendee goals",
    },
    {
      available: flagged > 0,
      detail: flagged
        ? `${metrics.vips.toLocaleString()} VIPs · ${metrics.sponsors.toLocaleString()} sponsors`
        : "None flagged yet",
      id: "status",
      label: "VIP / Sponsor status",
    },
  ];
}

export const KAMI_PREVIEW_SCENARIOS: KamiPreviewScenario[] = [
  {
    detail:
      "Sarah Chen has led four sports platform rounds this year and looks for teams with live audience traction.",
    guestMessage: "I'd like to meet investors interested in sports technology.",
    id: "founder",
    label: "Founder looking for investors",
    reason: "Sarah Chen invests in emerging sports platforms and is here tonight.",
    replies: ["Tell me more about them", "Introduce us", "Show someone else"],
    suggestion: {
      avatar: "/network/avatars/sarah-chen.png",
      company: "Velocity Capital",
      name: "Sarah Chen",
      role: "Partner",
    },
  },
  {
    detail:
      "Daniel Park spent six years in luxury hospitality before founding Atelier Residences, and is raising a seed round.",
    guestMessage: "I'm looking for founders building in luxury hospitality.",
    id: "investor",
    label: "Investor looking for founders",
    reason: "Daniel Park is raising for a members-only hospitality platform and is two tables away.",
    replies: ["Tell me more about them", "Introduce us", "Show someone else"],
    suggestion: {
      avatar: "/network/avatars/daniel-park.png",
      company: "Atelier Residences",
      name: "Daniel Park",
      role: "Co-founder",
    },
  },
  {
    detail:
      "Sofia Martinez runs partnerships for eight brands across the season and is scouting for next year.",
    guestMessage: "We're a brand looking for partners for next season.",
    id: "brand",
    label: "Brand looking for partners",
    reason: "Sofia Martinez places brand partnerships across the season and is free after the keynote.",
    replies: ["Tell me more about them", "Introduce us", "Show someone else"],
    suggestion: {
      avatar: "/network/avatars/sofia-martinez.png",
      company: "Meridian Sports",
      name: "Sofia Martinez",
      role: "Head of Partnerships",
    },
  },
];

const TONE_COPY: Record<KamiTone, { lead: string; opening: string }> = {
  concierge: {
    lead: "May I suggest an introduction?",
    opening: "How can I make tonight work for you?",
  },
  professional: {
    lead: "There is someone here worth meeting.",
    opening: "What are you hoping to get out of this event?",
  },
  warm: {
    lead: "I know someone you should meet.",
    opening: "What would make tonight valuable for you?",
  },
};

/** Fixed clock so the preview stays identical between renders. */
const PREVIEW_TIMES = ["8:41 PM", "8:42 PM", "8:42 PM"];

export function kamiToneCopy(tone: KamiTone) {
  return TONE_COPY[tone];
}

export function buildKamiConversation(
  config: KamiConfig,
  scenario: KamiPreviewScenario,
): KamiPreviewMessage[] {
  const tone = TONE_COPY[config.tone];
  const welcome = config.welcomeMessage.trim();

  return [
    {
      author: "kami",
      id: "welcome",
      lines: welcome ? [welcome, tone.opening] : [tone.opening],
      time: PREVIEW_TIMES[0],
    },
    {
      author: "guest",
      id: "guest",
      lines: [scenario.guestMessage],
      time: PREVIEW_TIMES[1],
    },
    {
      author: "kami",
      id: "suggestion",
      lines: [`${tone.lead} ${scenario.reason}`],
      time: PREVIEW_TIMES[2],
    },
  ];
}

export type KamiPreviewIntent = "detail" | "introduce" | "custom";

const PREVIEW_FOLLOW_UP_TIME = "8:43 PM";

/**
 * Canned answers for the demo conversation. No model call is made; the preview
 * only has to show an organizer the shape of the exchange.
 */
export function buildKamiFollowUp(
  scenario: KamiPreviewScenario,
  intent: KamiPreviewIntent,
): KamiPreviewMessage {
  const firstName = scenario.suggestion.name.split(" ")[0];
  const lines =
    intent === "detail"
      ? [scenario.detail]
      : intent === "introduce"
        ? [
            `Done. I've asked ${firstName} for a warm introduction and will bring you together shortly.`,
            "I won't suggest this introduction again tonight.",
          ]
        : [
            "Got it. I'll keep that in mind and come back when I find someone worth meeting.",
          ];

  return {
    author: "kami",
    id: `${scenario.id}-${intent}`,
    lines,
    time: PREVIEW_FOLLOW_UP_TIME,
  };
}

export function buildGuestMessage(id: string, text: string): KamiPreviewMessage {
  return { author: "guest", id, lines: [text], time: PREVIEW_FOLLOW_UP_TIME };
}

/** The first instruction sentence, echoed back so edits are visible. */
export function kamiInstructionSummary(config: KamiConfig) {
  const trimmed = config.instructions.trim();
  if (!trimmed) return "";
  const sentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  return sentence.length > 96 ? `${sentence.slice(0, 95).trimEnd()}…` : sentence;
}

/** How many context sources Kami is actually drawing on, for the preview chip. */
export function countActiveContext(event: EventRecord, config: KamiConfig) {
  const derived = deriveKamiContext(event).filter(
    (item) => item.available && isContextEnabled(config, item.id),
  ).length;
  return derived + config.customContext.filter((item) => item.enabled).length;
}
