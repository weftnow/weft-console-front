import { deriveEventMetrics, type EventRecord } from "./event-record";
import { isContextEnabled, type KamiConfig, type KamiTone } from "./kami-config";

export interface KamiContextItem {
  available: boolean;
  detail: string;
  id: string;
  label: string;
}

export interface KamiPreviewPerson {
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

const SCENARIO_TEMPLATES = [
  { id: "founder", label: "Founder looking for investors", guestMessage: "I'd like to meet investors interested in what I'm building.", fallback: { name: "A partner at a venture fund", role: "Investor", company: "Attending tonight" } },
  { id: "investor", label: "Investor looking for founders", guestMessage: "I'm looking for founders raising this year.", fallback: { name: "A founder raising a seed round", role: "Founder", company: "Attending tonight" } },
  { id: "brand", label: "Brand looking for partners", guestMessage: "We're a brand looking for partners for next season.", fallback: { name: "A head of partnerships", role: "Partnerships", company: "Attending tonight" } },
] as const;

const REPLIES = ["Tell me more about them", "Introduce us", "Show someone else"];

/** Example conversations for the organizer preview, built from this event's guests where possible. */
export function buildKamiPreviewScenarios(event: EventRecord): KamiPreviewScenario[] {
  const guests = event.attendees.guests.filter((guest) => guest.firstName.trim());
  return SCENARIO_TEMPLATES.map((template, index) => {
    const guest = guests[index];
    const suggestion: KamiPreviewPerson = guest
      ? { name: `${guest.firstName} ${guest.lastName}`.trim(), role: guest.position || guest.guestType, company: guest.company }
      : { ...template.fallback };
    const generic = suggestion.name.charAt(0).toLowerCase() + suggestion.name.slice(1);
    return {
      id: template.id,
      label: template.label,
      guestMessage: template.guestMessage,
      replies: REPLIES,
      suggestion,
      reason: guest ? `${suggestion.name} is here tonight and fits what you described.` : `There is ${generic} here tonight who fits what you described.`,
      detail: guest
        ? `${suggestion.name}${suggestion.role ? `, ${suggestion.role}` : ""}${suggestion.company ? ` at ${suggestion.company}` : ""}, is on this event's guest list.`
        : "In a live event, Kami explains why this person is relevant using their guest profile.",
    };
  });
}

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

/** Example answers for the preview conversation. No model call is made. */
export function buildKamiFollowUp(
  scenario: KamiPreviewScenario,
  intent: KamiPreviewIntent,
): KamiPreviewMessage {
  const firstName = /^A /.test(scenario.suggestion.name) ? "them" : scenario.suggestion.name.split(" ")[0];
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
