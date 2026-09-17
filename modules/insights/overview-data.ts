export type MetricIcon = "calendar" | "people" | "link" | "star" | "repeat";

export interface OverviewMetric {
  comparison: string;
  icon: MetricIcon;
  label: string;
  selected?: boolean;
  trend: string;
  value: string;
}

export interface ConnectionPoint {
  city: string;
  date: string;
  value: number;
}

export interface EventPerformance {
  attendees: number;
  city: string;
  date: string;
  name: string;
  introductions: number;
  repeatGuests: number;
  theme: CityTheme;
  valuable: number;
}

export interface CityTheme {
  horizon: string;
  sky: string;
}

export interface UpcomingEvent {
  city: string;
  date: string;
  daysToGo: number;
  name: string;
  registered: number;
  theme: CityTheme;
}

export interface NetworkMovement {
  city: string;
  detail: string;
  signal: string;
  theme: CityTheme;
}

export interface CompletedEvent {
  attendees: number;
  city: string;
  date: string;
  introductions: number;
  name: string;
  valuable: number;
}

export const organizerOverviewData = {
  metrics: [
    { value: "12", label: "Events", icon: "calendar", trend: "+33%", comparison: "vs last year" },
    { value: "1,840", label: "Attendees", icon: "people", trend: "+28%", comparison: "vs last year" },
    { value: "923", label: "Introductions completed", icon: "link", trend: "+41%", comparison: "vs last year" },
    { value: "78%", label: "Valuable connections", icon: "star", trend: "+6%", comparison: "vs previous 3 events", selected: true },
    { value: "31%", label: "Repeat attendees", icon: "repeat", trend: "+9%", comparison: "vs last year" },
  ] satisfies OverviewMetric[],
  connectionQuality: [
    { city: "Monaco", date: "May 2024", value: 42 },
    { city: "Miami", date: "Dec 2024", value: 61 },
    { city: "Austin", date: "Mar 2025", value: 72 },
    { city: "Dubai", date: "May 2025", value: 59 },
    { city: "Ibiza", date: "Jul 2025", value: 75 },
    { city: "Las Vegas", date: "Nov 2025", value: 86 },
  ] satisfies ConnectionPoint[],
  performance: [
    { name: "Miami Art Week", city: "Miami", date: "Sep 12, 2026", attendees: 142, introductions: 93, valuable: 82, repeatGuests: 37, theme: { sky: "#507da9", horizon: "#eb985b" } },
    { name: "Monaco GP", city: "Monaco", date: "May 24, 2026", attendees: 118, introductions: 81, valuable: 79, repeatGuests: 29, theme: { sky: "#5b7d9a", horizon: "#f0a34a" } },
    { name: "Bitcoin Week", city: "Las Vegas", date: "Mar 3, 2026", attendees: 164, introductions: 106, valuable: 76, repeatGuests: 33, theme: { sky: "#47342c", horizon: "#d57c24" } },
    { name: "Abu Dhabi", city: "Abu Dhabi", date: "Jan 18, 2026", attendees: 128, introductions: 77, valuable: 74, repeatGuests: 28, theme: { sky: "#725c8e", horizon: "#ef9259" } },
    { name: "Singapore", city: "Singapore", date: "Nov 9, 2025", attendees: 94, introductions: 62, valuable: 71, repeatGuests: 26, theme: { sky: "#376caf", horizon: "#f2a14d" } },
  ] satisfies EventPerformance[],
  upcoming: [
    { city: "Las Vegas", name: "F1 Week", date: "Nov 19, 2026", registered: 186, daysToGo: 68, theme: { sky: "#635777", horizon: "#ee9a52" } },
    { city: "Singapore", name: "Innovation Summit", date: "Dec 4, 2026", registered: 94, daysToGo: 83, theme: { sky: "#2f79c3", horizon: "#eb9a4e" } },
    { city: "Abu Dhabi", name: "Global Gathering", date: "Jan 15, 2027", registered: 71, daysToGo: 125, theme: { sky: "#647cae", horizon: "#e88d61" } },
  ] satisfies UpcomingEvent[],
  movement: [
    { city: "Miami", detail: "142 attendees", signal: "46 returning", theme: { sky: "#5592c0", horizon: "#d9a36f" } },
    { city: "Las Vegas", detail: "186 registered", signal: "28 also attended Miami", theme: { sky: "#4b3f75", horizon: "#e88131" } },
    { city: "Singapore", detail: "94 registered", signal: "17 have attended another event", theme: { sky: "#3289d3", horizon: "#dd8e4d" } },
  ] satisfies NetworkMovement[],
  completed: {
    name: "Miami Art Week",
    city: "Miami",
    date: "Sep 12, 2026",
    attendees: 142,
    introductions: 93,
    valuable: 82,
  } satisfies CompletedEvent,
};
