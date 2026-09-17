import { SEEDED_EVENT_GUESTS } from "./seed-guests";

export type EventGuestType = "Attendee" | "VIP" | "Sponsor";

/** How a guest reached the roster: a CSV import or the manual entry form. */
export type EventGuestSource = "csv" | "manual";

export interface EventGuestRecord {
  company: string;
  email: string;
  firstName: string;
  guestType: EventGuestType;
  lastName: string;
  linkedin: string;
  position: string;
  /** Audience segment, e.g. "Founders". Empty when the import omitted it. */
  profileType: string;
  source: EventGuestSource;
}

export interface EventStaffRecord {
  avatar: string;
  id: string;
  name: string;
  role: string;
}

export interface EventAttendeeImport {
  /** Total data rows in the imported file, even if not all were stored. */
  attendees: number;
  fileName: string;
  sponsors: number;
  /** Rows actually kept on the record; below `attendees` when truncated. */
  storedGuests: number;
  vips: number;
}

export interface EventRecord {
  attendees: {
    imported: EventAttendeeImport | null;
    /** Imported and manually added guests in one roster; see `source`. */
    guests: EventGuestRecord[];
  };
  categories: string[];
  city: string;
  coverImage: string | null;
  createdAt: string;
  description: string;
  endDate: string;
  endTime: string;
  expectedAttendees: number | null;
  expectedAudience: string[];
  id: string;
  name: string;
  staff: EventStaffRecord[];
  startDate: string;
  startTime: string;
  updatedAt: string;
  venue: string;
}

export interface EventMetrics {
  attendees: number;
  attendeesAreExpected: boolean;
  sponsors: number;
  staff: number;
  vips: number;
}

/**
 * Audience vocabulary shared by the event-level expected audience, the manual
 * guest form, and CSV profile-type normalization.
 */
export const EVENT_AUDIENCE_OPTIONS = [
  "Founders",
  "Investors",
  "Family Offices",
  "Executives",
  "Brands",
  "Sponsors",
  "Creators",
  "Media",
  "Athletes",
  "Government",
  "Service Providers",
] as const;

export type EventStatus = "upcoming" | "live" | "completed";
export type EventDetailTab = "overview" | "attendees" | "kami" | "staff" | "insights";

const EVENT_STORAGE_KEY = "weft:events:v1";

/**
 * Upper bound on guest rows persisted per event. `localStorage` gives us
 * roughly 5 MB for every Weft event combined, and a normalized cover image is
 * stored as a data URL on the same record, so an unbounded import would evict
 * the event it belongs to. At ~220 bytes of JSON per guest this reserves about
 * 440 KB. Imports beyond the cap keep their aggregate counts and report the
 * truncation instead of failing.
 */
export const MAX_STORED_GUESTS = 2000;
const EVENT_DETAIL_TABS: EventDetailTab[] = [
  "overview",
  "attendees",
  "kami",
  "staff",
  "insights",
];

type StoredEvents = Record<string, EventRecord>;

export const SEEDED_EVENT: EventRecord = {
  attendees: {
    imported: {
      attendees: 186,
      fileName: "las-vegas-f1-week-guests.csv",
      sponsors: 7,
      storedGuests: SEEDED_EVENT_GUESTS.length,
      vips: 23,
    },
    guests: SEEDED_EVENT_GUESTS,
  },
  categories: ["Sports", "Luxury", "Investing", "Technology", "Entertainment"],
  city: "Las Vegas, USA",
  coverImage: null,
  createdAt: "2026-09-10T15:00:00.000Z",
  description:
    "An invitation-only gathering during F1 Week bringing together founders, investors, family offices, luxury brands, and industry leaders for meaningful connections and curated conversations.",
  endDate: "2026-11-22",
  endTime: "22:00",
  expectedAttendees: 186,
  expectedAudience: ["Founders", "Investors", "Family Offices", "Executives", "Brands"],
  id: "las-vegas-f1-week",
  name: "Las Vegas · F1 Week",
  staff: [
    { id: "maria", name: "Maria Chen", role: "Lead wefter", avatar: "/network/avatars/sarah-chen.png" },
    { id: "daniel", name: "Daniel Park", role: "Wefter", avatar: "/network/avatars/daniel-park.png" },
    { id: "sophie", name: "Sophie Laurent", role: "Wefter", avatar: "/network/avatars/emma-laurent.png" },
    { id: "alex", name: "Alex Rivera", role: "Guest experience", avatar: "/network/avatars/alex-rivera.png" },
    { id: "sofia", name: "Sofia Martinez", role: "Sponsor liaison", avatar: "/network/avatars/sofia-martinez.png" },
  ],
  startDate: "2026-11-19",
  startTime: "18:00",
  updatedAt: "2026-09-15T16:30:00.000Z",
  venue: "Wynn Las Vegas",
};

export const EVENT_COVER_PLACEHOLDER_ART = {
  sky: "#69727d",
  horizon: "#c58e6a",
  profile:
    "polygon(0% 100%,0% 72%,8% 72%,8% 52%,17% 52%,17% 70%,26% 70%,26% 38%,34% 38%,34% 62%,44% 62%,44% 28%,54% 28%,54% 66%,64% 66%,64% 48%,73% 48%,73% 72%,84% 72%,84% 55%,93% 55%,93% 74%,100% 74%,100% 100%)",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEventRecord(value: unknown): value is EventRecord {
  if (!isRecord(value) || !isRecord(value.attendees)) return false;

  // `manual` is the pre-roster key; migrateEventRecord folds it into `guests`.
  const roster = value.attendees.guests ?? value.attendees.manual;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.city === "string" &&
    typeof value.venue === "string" &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.categories) &&
    Array.isArray(value.expectedAudience) &&
    Array.isArray(value.staff) &&
    Array.isArray(roster)
  );
}

/**
 * Bring a stored record up to the current shape. Events saved before the
 * roster existed keep their guests under `manual` and carry no `profileType`,
 * `source`, or `storedGuests`, so they would otherwise render an empty table.
 */
function migrateEventRecord(event: EventRecord): EventRecord {
  const attendees = event.attendees as EventRecord["attendees"] & {
    manual?: EventGuestRecord[];
  };
  const roster = attendees.guests ?? attendees.manual ?? [];
  const guests = roster.map((guest) => ({
    ...guest,
    profileType: guest.profileType ?? "",
    source: guest.source ?? ("manual" as EventGuestSource),
  }));
  const imported = event.attendees.imported;

  return {
    ...event,
    attendees: {
      guests,
      imported: imported
        ? {
            ...imported,
            storedGuests:
              imported.storedGuests ??
              guests.filter((guest) => guest.source === "csv").length,
          }
        : null,
    },
  };
}

function readStoredEvents(): StoredEvents {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(EVENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, EventRecord] => isEventRecord(entry[1]))
        .map(([id, event]) => [id, migrateEventRecord(event)]),
    );
  } catch {
    return {};
  }
}

function parseLocalDate(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not decode image"));
    image.onload = () => resolve(image);
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82);
  });
}

export function createEventId(name: string, existingIds?: string[]) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "event";
  const occupied = new Set(existingIds ?? Object.keys(readStoredEvents()));

  if (!occupied.has(normalized) && normalized !== SEEDED_EVENT.id) return normalized;

  let suffix = 2;
  while (occupied.has(`${normalized}-${suffix}`)) suffix += 1;
  return `${normalized}-${suffix}`;
}

export function deriveEventMetrics(event: EventRecord): EventMetrics {
  const imported = event.attendees.imported;
  // Import aggregates already count every row in the file, so only manually
  // added guests are added on top. Counting the roster instead would undercount
  // a truncated import and double-count a complete one.
  const manual = event.attendees.guests.filter((guest) => guest.source === "manual");

  return {
    attendees: (imported?.attendees ?? 0) + manual.length,
    attendeesAreExpected: false,
    sponsors:
      (imported?.sponsors ?? 0) + manual.filter((guest) => guest.guestType === "Sponsor").length,
    staff: event.staff.length,
    vips: (imported?.vips ?? 0) + manual.filter((guest) => guest.guestType === "VIP").length,
  };
}

export function deriveEventStatus(event: EventRecord, now = new Date()): EventStatus {
  const start = parseLocalDate(event.startDate);
  const end = parseLocalDate(event.endDate, true);
  if (!start || !end || now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export function formatEventDateRange(start: string, end: string) {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (!startDate && !endDate) return "Dates not added";

  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (!startDate) return formatter.format(endDate!);
  if (!endDate || start === end) return formatter.format(startDate);

  const startLabel = formatter.format(startDate);
  const endLabel = formatter.format(endDate);
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startLabel.replace(`, ${startDate.getFullYear()}`, "")} – ${endLabel}`;
  }
  return `${startLabel} – ${endLabel}`;
}

export function formatRelativeActivity(isoDate: string, now = new Date()) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Recently";

  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
}

export function getEventDetailTab(value: string | string[] | undefined): EventDetailTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return EVENT_DETAIL_TABS.includes(candidate as EventDetailTab)
    ? (candidate as EventDetailTab)
    : "overview";
}

export function loadEventRecord(eventId: string) {
  if (eventId === SEEDED_EVENT.id) return SEEDED_EVENT;
  return readStoredEvents()[eventId] ?? null;
}

export async function normalizeCoverImage(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadBrowserImage(objectUrl);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, 1600 / longestEdge);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return originalDataUrl;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encoded = await canvasToBlob(canvas);
    return encoded ? readFileAsDataUrl(encoded) : originalDataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/**
 * Persist an event. A cover image and a large roster share the same storage
 * budget, so on a quota failure this retries once without the guest rows —
 * losing row detail is recoverable by re-importing, losing the event is not.
 */
export function saveEventRecord(event: EventRecord) {
  if (typeof window === "undefined") {
    throw new Error("Event records can only be saved in the browser");
  }
  const events = readStoredEvents();

  const write = (candidate: EventRecord) => {
    window.localStorage.setItem(
      EVENT_STORAGE_KEY,
      JSON.stringify({ ...events, [candidate.id]: candidate }),
    );
  };

  try {
    write(event);
    return { droppedGuests: false };
  } catch (error) {
    if (!isQuotaError(error) || event.attendees.guests.length === 0) throw error;

    write({
      ...event,
      attendees: {
        ...event.attendees,
        guests: [],
        imported: event.attendees.imported
          ? { ...event.attendees.imported, storedGuests: 0 }
          : null,
      },
    });
    return { droppedGuests: true };
  }
}
