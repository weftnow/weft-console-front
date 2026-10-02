import type { EventRecord } from "./event-record";

export type KamiTone = "warm" | "professional" | "concierge";
export type KamiActivation = "day-before" | "doors-open" | "on-request";
export type KamiChannel = "web" | "sms" | "calls" | "whatsapp";

/** A note the organizer added by hand, in their own words. */
export interface KamiCustomContext {
  enabled: boolean;
  id: string;
  text: string;
}

export interface KamiConfig {
  activation: KamiActivation;
  channels: Record<KamiChannel, boolean>;
  /** Overrides for derived context items, keyed by item id. Missing means on. */
  context: Record<string, boolean>;
  customContext: KamiCustomContext[];
  fallbackMessage: string;
  instructions: string;
  tone: KamiTone;
  welcomeMessage: string;
}

export const KAMI_WELCOME_LIMIT = 200;
export const KAMI_INSTRUCTIONS_LIMIT = 500;
export const KAMI_FALLBACK_LIMIT = 160;
export const KAMI_CONTEXT_LIMIT = 240;
export const MAX_CUSTOM_CONTEXT = 8;

export const KAMI_TONES: { id: KamiTone; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "professional", label: "Professional" },
  { id: "concierge", label: "Concierge" },
];

export const KAMI_ACTIVATIONS: { id: KamiActivation; label: string }[] = [
  { id: "day-before", label: "Day before the event" },
  { id: "doors-open", label: "When doors open" },
  { id: "on-request", label: "Only when a guest starts" },
];

/** WhatsApp stays off until the WhatsApp channel is connected; the channel is announced, not connected. */
export const KAMI_CHANNELS: { available: boolean; id: KamiChannel; label: string; short: string }[] = [
  { available: true, id: "web", label: "Web (Event app)", short: "Event app" },
  { available: true, id: "sms", label: "SMS", short: "SMS" },
  { available: true, id: "calls", label: "Calls", short: "Calls" },
  { available: false, id: "whatsapp", label: "WhatsApp", short: "WhatsApp" },
];

const KAMI_STORAGE_KEY = "weft:kami:v1";

const TONES = new Set<string>(KAMI_TONES.map((tone) => tone.id));
const ACTIVATIONS = new Set<string>(KAMI_ACTIVATIONS.map((activation) => activation.id));

const DEFAULT_AUDIENCE = ["Investors", "Founders", "Brands", "Family Offices"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "Founders, Investors and Brands" — plain English, no serial comma. */
export function formatList(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function clamp(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
}

function defaultWelcomeMessage(event: EventRecord) {
  const name = event.name.trim() || "this event";
  return clamp(
    `Welcome to ${name}! I'm Kami, here to help you meet the right people and make the most of this event.`,
    KAMI_WELCOME_LIMIT,
  );
}

function defaultInstructions(event: EventRecord) {
  const audience = event.expectedAudience.length ? event.expectedAudience : DEFAULT_AUDIENCE;
  const focus = event.categories.slice(0, 2).map((category) => category.toLowerCase());
  const opportunities = focus.length
    ? `Highlight relevant ${formatList(focus)} opportunities during the event.`
    : "Highlight relevant opportunities during the event.";

  return clamp(
    `Prioritize high quality introductions between ${formatList(
      audience.map((profile) => profile.toLowerCase()),
    )}. Keep interactions concise and natural. ${opportunities}`,
    KAMI_INSTRUCTIONS_LIMIT,
  );
}

function defaultFallbackMessage() {
  return "I'm not sure about that one yet. I'll pass it to the event team and come back to you.";
}

/**
 * Kami always starts from a complete configuration derived from the event, so
 * an organizer never lands on an empty or half-configured tab.
 */
export function deriveKamiDefaults(event: EventRecord): KamiConfig {
  return {
    activation: "doors-open",
    channels: { calls: true, sms: true, web: true, whatsapp: false },
    context: {},
    customContext: [],
    fallbackMessage: defaultFallbackMessage(),
    instructions: defaultInstructions(event),
    tone: "warm",
    welcomeMessage: defaultWelcomeMessage(event),
  };
}

function normalizeContext(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}

function normalizeCustomContext(value: unknown): KamiCustomContext[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .filter((entry) => typeof entry.id === "string" && typeof entry.text === "string")
    .slice(0, MAX_CUSTOM_CONTEXT)
    .map((entry) => ({
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      id: entry.id as string,
      text: (entry.text as string).slice(0, KAMI_CONTEXT_LIMIT),
    }));
}

function normalizeKamiConfig(value: unknown, defaults: KamiConfig): KamiConfig {
  if (!isRecord(value)) return defaults;
  const channels = isRecord(value.channels) ? value.channels : {};

  const text = (candidate: unknown, fallback: string, limit: number) =>
    typeof candidate === "string" ? candidate.slice(0, limit) : fallback;
  const flag = (candidate: unknown, fallback: boolean) =>
    typeof candidate === "boolean" ? candidate : fallback;

  return {
    activation: ACTIVATIONS.has(String(value.activation))
      ? (value.activation as KamiActivation)
      : defaults.activation,
    channels: {
      calls: flag(channels.calls, defaults.channels.calls),
      sms: flag(channels.sms, defaults.channels.sms),
      web: flag(channels.web, defaults.channels.web),
      // WhatsApp has no messaging integration yet, so it can never be stored on.
      whatsapp: false,
    },
    context: normalizeContext(value.context),
    customContext: normalizeCustomContext(value.customContext),
    fallbackMessage: text(value.fallbackMessage, defaults.fallbackMessage, KAMI_FALLBACK_LIMIT),
    instructions: text(value.instructions, defaults.instructions, KAMI_INSTRUCTIONS_LIMIT),
    tone: TONES.has(String(value.tone)) ? (value.tone as KamiTone) : defaults.tone,
    welcomeMessage: text(value.welcomeMessage, defaults.welcomeMessage, KAMI_WELCOME_LIMIT),
  };
}

function readStoredConfigs(): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(KAMI_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function loadKamiConfig(event: EventRecord): KamiConfig {
  const defaults = deriveKamiDefaults(event);
  return normalizeKamiConfig(readStoredConfigs()[event.id], defaults);
}

export function saveKamiConfig(eventId: string, config: KamiConfig) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      KAMI_STORAGE_KEY,
      JSON.stringify({ ...readStoredConfigs(), [eventId]: config }),
    );
  } catch {
    // A full storage quota must not block configuring Kami in the session.
  }
}

export function clearKamiConfig(eventId: string) {
  if (typeof window === "undefined") return;
  const stored = readStoredConfigs();
  delete stored[eventId];

  try {
    window.localStorage.setItem(KAMI_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Same as above: losing persistence is recoverable, blocking the UI is not.
  }
}

export function isDefaultKamiConfig(config: KamiConfig, defaults: KamiConfig) {
  return (
    config.activation === defaults.activation &&
    config.channels.calls === defaults.channels.calls &&
    config.channels.sms === defaults.channels.sms &&
    config.channels.web === defaults.channels.web &&
    config.channels.whatsapp === defaults.channels.whatsapp &&
    Object.values(config.context).every((enabled) => enabled) &&
    config.customContext.length === 0 &&
    config.fallbackMessage === defaults.fallbackMessage &&
    config.instructions === defaults.instructions &&
    config.tone === defaults.tone &&
    config.welcomeMessage === defaults.welcomeMessage
  );
}

/** Derived context is on unless the organizer has explicitly switched it off. */
export function isContextEnabled(config: KamiConfig, id: string) {
  return config.context[id] ?? true;
}

export function activeChannelLabel(config: KamiConfig) {
  const active = KAMI_CHANNELS.filter((channel) => config.channels[channel.id]).map(
    (channel) => channel.short,
  );
  return active.length ? formatList(active) : "No channel enabled";
}
