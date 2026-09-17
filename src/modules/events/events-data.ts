import type { CityArt } from "@/shared/ui/city-artwork";

/**
 * Mock data for the Events design implementation.
 * No queries, mutations, or filtering behaviour yet — this is presentation only.
 */

const stripProfile =
  "polygon(0% 100%,0% 72%,6% 72%,6% 54%,14% 54%,14% 68%,22% 68%,22% 42%,30% 42%,30% 64%,38% 64%,38% 32%,44% 32%,46% 10%,48% 32%,54% 32%,54% 60%,64% 60%,64% 36%,72% 36%,72% 66%,82% 66%,82% 46%,92% 46%,92% 72%,100% 72%,100% 100%)";

const marinaProfile =
  "polygon(0% 8%,100% 8%,100% 16%,92% 16%,92% 100%,76% 100%,76% 16%,58% 16%,58% 100%,42% 100%,42% 16%,24% 16%,24% 100%,8% 100%,8% 16%,0% 16%)";

const domeProfile =
  "polygon(0% 100%,0% 72%,7% 72%,7% 28%,11% 20%,15% 28%,15% 72%,28% 72%,32% 60%,38% 48%,46% 41%,54% 41%,62% 48%,68% 60%,72% 72%,85% 72%,85% 28%,89% 20%,93% 28%,93% 72%,100% 72%,100% 100%)";

const terraceProfile =
  "polygon(0% 100%,0% 74%,8% 62%,16% 62%,16% 52%,26% 52%,26% 44%,36% 44%,36% 56%,46% 56%,46% 38%,58% 38%,58% 60%,70% 60%,70% 48%,82% 48%,82% 66%,100% 66%,100% 100%)";

const towerProfile =
  "polygon(0% 100%,0% 76%,8% 76%,8% 58%,17% 58%,17% 70%,26% 70%,26% 40%,34% 40%,34% 62%,43% 62%,43% 30%,52% 30%,52% 66%,62% 66%,62% 50%,72% 50%,72% 72%,84% 72%,84% 56%,92% 56%,92% 74%,100% 74%,100% 100%)";

const beachfrontProfile =
  "polygon(0% 100%,0% 70%,7% 70%,7% 46%,14% 46%,14% 70%,21% 70%,21% 40%,28% 40%,28% 70%,35% 70%,35% 50%,42% 50%,42% 70%,49% 70%,49% 36%,56% 36%,56% 70%,63% 70%,63% 52%,70% 52%,70% 70%,77% 70%,77% 44%,84% 44%,84% 70%,100% 70%,100% 100%)";

const peakProfile =
  "polygon(0% 100%,0% 76%,14% 46%,24% 60%,40% 18%,52% 50%,62% 40%,74% 62%,86% 48%,100% 70%,100% 100%)";

const art = {
  lasVegas: { sky: "#3b3053", horizon: "#f0842c", profile: stripProfile },
  singapore: { sky: "#2f79c3", horizon: "#eb9a4e", profile: marinaProfile },
  abuDhabi: { sky: "#647cae", horizon: "#e8b06a", profile: domeProfile },
  aspen: { sky: "#7ea6cd", horizon: "#dfe6ec", profile: peakProfile },
  miami: { sky: "#507da9", horizon: "#eb985b", profile: beachfrontProfile },
  monaco: { sky: "#5b7d9a", horizon: "#f0a34a", profile: terraceProfile },
  austin: { sky: "#4b5f86", horizon: "#ef9a55", profile: towerProfile },
  newYork: { sky: "#566a8a", horizon: "#e79a63" },
} satisfies Record<string, CityArt>;

export type EventStatus = "live" | "upcoming" | "completed";

export interface LiveEventMetric {
  glyph: "people" | "link" | "clock";
  label: string;
  /** Renders the value as a progress ring instead of a glyph. */
  ring?: number;
  value: string;
}

export interface LiveEvent {
  art: CityArt;
  caption: { dates: string; subtitle: string; title: string };
  dates: string;
  location: string;
  metrics: LiveEventMetric[];
  name: string;
}

export interface UpcomingEvent {
  art: CityArt;
  countdown: string;
  date: string;
  name: string;
  registered: number;
  staff: number;
}

export interface EventRow {
  art: CityArt;
  attendees: number;
  city: string;
  date: string;
  introductions: number | null;
  name: string;
  repeatAttendees: number | null;
  status: EventStatus;
  valuable: number | null;
}

export interface CompletedEvent {
  art: CityArt;
  attendees: number;
  city: string;
  date: string;
  introductions: number;
  name: string;
  valuable: number;
}

export const statusLabels: Record<EventStatus, string> = {
  live: "Live",
  upcoming: "Upcoming",
  completed: "Completed",
};

export const eventsData = {
  live: {
    name: "Las Vegas · F1 Week",
    dates: "Nov 19 – 22, 2026",
    location: "Las Vegas, USA",
    art: art.lasVegas,
    caption: { title: "Las Vegas", subtitle: "F1 Week", dates: "Nov 19 – 22, 2026" },
    metrics: [
      { glyph: "people", value: "186", label: "Attendees" },
      { glyph: "link", value: "74", label: "Introductions completed" },
      { glyph: "people", value: "81%", label: "Valuable connections", ring: 81 },
      { glyph: "clock", value: "12", label: "Guests still need a valuable intro" },
    ],
  } satisfies LiveEvent,
  upcoming: [
    { name: "Singapore", date: "Dec 4, 2026", countdown: "In 72 days", registered: 94, staff: 5, art: art.singapore },
    { name: "Abu Dhabi", date: "Jan 15, 2027", countdown: "In 114 days", registered: 71, staff: 4, art: art.abuDhabi },
    { name: "Aspen", date: "Feb 12, 2027", countdown: "In 150 days", registered: 48, staff: 3, art: art.aspen },
  ] satisfies UpcomingEvent[],
  all: [
    { name: "Las Vegas · F1 Week", city: "Las Vegas", date: "Nov 19, 2026", status: "live", attendees: 186, introductions: 74, valuable: 81, repeatAttendees: 37, art: art.lasVegas },
    { name: "Singapore", city: "Singapore", date: "Dec 4, 2026", status: "upcoming", attendees: 94, introductions: null, valuable: null, repeatAttendees: null, art: art.singapore },
    { name: "Abu Dhabi", city: "Abu Dhabi", date: "Jan 15, 2027", status: "upcoming", attendees: 71, introductions: null, valuable: null, repeatAttendees: null, art: art.abuDhabi },
    { name: "Aspen", city: "Aspen", date: "Feb 12, 2027", status: "upcoming", attendees: 48, introductions: null, valuable: null, repeatAttendees: null, art: art.aspen },
    { name: "Miami Art Week", city: "Miami", date: "Sep 12, 2026", status: "completed", attendees: 142, introductions: 93, valuable: 82, repeatAttendees: 37, art: art.miami },
    { name: "Monaco GP", city: "Monaco", date: "May 24, 2026", status: "completed", attendees: 118, introductions: 81, valuable: 79, repeatAttendees: 29, art: art.monaco },
    { name: "Austin Tech Week", city: "Austin", date: "Mar 15, 2026", status: "completed", attendees: 96, introductions: 67, valuable: 76, repeatAttendees: 28, art: art.austin },
    { name: "New York", city: "New York", date: "Jan 26, 2026", status: "completed", attendees: 104, introductions: 71, valuable: 73, repeatAttendees: 25, art: art.newYork },
  ] satisfies EventRow[],
  completed: [
    { name: "Miami Art Week", city: "Miami", date: "Sep 12, 2026", attendees: 142, introductions: 93, valuable: 82, art: art.miami },
    { name: "Monaco Grand Prix", city: "Monaco", date: "May 24, 2026", attendees: 118, introductions: 81, valuable: 79, art: art.monaco },
    { name: "Austin Tech Week", city: "Austin", date: "Mar 15, 2026", attendees: 96, introductions: 67, valuable: 76, art: art.austin },
  ] satisfies CompletedEvent[],
};
