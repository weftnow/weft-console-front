import type { I18n } from "@/shared/i18n/i18n";
import { deriveScheduleStatus } from "./event-schedule";
import { z } from "zod";
import type { AttendeeImportDto } from "./attendee-import-schemas";
import type { ExclusionReason, MatchBlockDto } from "@/modules/attendees/networking-schemas";
import type { ProfileCompleteness } from "@/modules/attendees/profile-schemas";
export { EVENT_AUDIENCE_OPTIONS } from "./event-options";

export type EventGuestType = "Attendee" | "VIP" | "Sponsor";
export type EventGuestSource = "csv" | "manual";

export interface EventGuestRecord {
  company: string;
  email: string;
  firstName: string;
  guestType: EventGuestType;
  lastName: string;
  linkedin: string;
  phone: string;
  position: string;
  profileType: string;
  source: EventGuestSource;
}

export interface SavedEventGuestRecord extends EventGuestRecord {
  createdAt: string;
  id: string;
  importId: string | null;
  personId: string;
  revision: number;
  networking: { status: "included" | "excluded"; excludedAt: string | null; reason: ExclusionReason | null; version: number };
  profile: { version: number; completeness: ProfileCompleteness };
  updatedAt: string;
}

export interface EventStaffRecord {
  avatar: string;
  id: string;
  name: string;
  role: string;
}

export interface EventRecord {
  attendees: { canManage: boolean; guests: SavedEventGuestRecord[]; imports: AttendeeImportDto[]; importCount: number; matchBlocks: MatchBlockDto[] };
  categories: string[];
  city: string;
  coverImage: string | null;
  createdAt: string;
  description: string;
  endDate: string;
  endTime: string;
  endsAt?: string;
  expectedAttendees: number | null;
  expectedAudience: string[];
  id: string;
  name: string;
  organizationId?: string;
  staff: EventStaffRecord[];
  startDate: string;
  startTime: string;
  startsAt?: string;
  timezone?: string;
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

export type EventStatus = "upcoming" | "live" | "completed";
const EVENT_DETAIL_TABS = ["overview", "attendees", "matches", "kami", "staff", "settings", "insights"] as const;
export type EventDetailTab = (typeof EVENT_DETAIL_TABS)[number];

export const EVENT_COVER_PLACEHOLDER_ART = {
  sky: "#69727d",
  horizon: "#c58e6a",
  profile:
    "polygon(0% 100%,0% 72%,8% 72%,8% 52%,17% 52%,17% 70%,26% 70%,26% 38%,34% 38%,34% 62%,44% 62%,44% 28%,54% 28%,54% 66%,64% 66%,64% 48%,73% 48%,73% 72%,84% 72%,84% 55%,93% 55%,93% 74%,100% 74%,100% 100%)",
} as const;

function parseLocalDate(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

export function deriveEventMetrics(event: EventRecord): EventMetrics {
  const guests = event.attendees.guests;
  return {
    attendees: guests.length,
    attendeesAreExpected: false,
    sponsors: guests.filter((guest) => guest.guestType === "Sponsor").length,
    staff: event.staff.length,
    vips: guests.filter((guest) => guest.guestType === "VIP").length,
  };
}

export function deriveEventStatus(event: EventRecord, now = new Date()): EventStatus {
  if (event.startsAt && event.endsAt) return deriveScheduleStatus(event.startsAt, event.endsAt, now);
  const start = parseLocalDate(event.startDate);
  const end = parseLocalDate(event.endDate, true);
  if (!start || !end || now < start) return "upcoming";
  if (now > end) return "completed";
  return "live";
}

export function formatEventDateRange(i18n: I18n, start: string, end: string) {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (!startDate && !endDate) return i18n.dict.events.dates.notAdded;
  const format = (value: Date) => i18n.date(value, { day: "numeric", month: "short", year: "numeric" });
  if (!startDate) return format(endDate!);
  if (!endDate || start === end) return format(startDate);
  const startLabel = format(startDate);
  const endLabel = format(endDate);
  // Same-year ranges drop the first year; the year is dropped by formatting without it.
  if (startDate.getFullYear() === endDate.getFullYear()) return `${i18n.date(startDate, { day: "numeric", month: "short" })} – ${endLabel}`;
  return `${startLabel} – ${endLabel}`;
}

export function formatRelativeActivity(i18n: I18n, isoDate: string, now = new Date()) {
  const copy = i18n.dict.events.relative;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return copy.recently;
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 2) return copy.justNow;
  if (minutes < 60) return i18n.t(copy.minutesAgo, { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return i18n.plural(copy.hoursAgo, hours);
  const days = Math.round(hours / 24);
  if (days < 7) return i18n.plural(copy.daysAgo, days);
  return i18n.plural(copy.weeksAgo, Math.round(days / 7));
}

export function getEventDetailTab(value: string | string[] | undefined): EventDetailTab {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = z.enum(EVENT_DETAIL_TABS).safeParse(candidate);
  return parsed.success ? parsed.data : "overview";
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
    const encoded = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    return encoded ? readFileAsDataUrl(encoded) : originalDataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
