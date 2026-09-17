/**
 * Mock data for the People design implementation.
 * No queries, mutations, search, filtering or pagination behaviour yet —
 * this is presentation only.
 */

export type PeopleMetricIcon = "people" | "return" | "outcomes" | "calendar";

export type PeopleMetric = {
  value: string;
  label: string;
  description?: string;
  icon: PeopleMetricIcon;
};

export type PersonStatus = "vip" | "returning" | "first-time";

export type DirectoryPerson = {
  id: string;
  name: string;
  /** Portrait in `public/network/avatars`, or `null` to fall back to initials. */
  avatar: string | null;
  initials: string;
  role: string;
  company: string;
  events: number;
  goal: string;
  valuable: number;
  nextEvent: { city: string; date: string };
  status: PersonStatus;
};

export type ParticipationDetail = {
  icon: "calendar" | "goal" | "status" | "registration";
  label: string;
  value: string;
  caption?: string;
  tone?: "status" | "confirmed";
};

export type EventHistoryEntry = {
  id: string;
  name: string;
  date: string;
  introductions: number;
  valuable: number;
};

export type MetConnection = {
  id: string;
  name: string;
  avatar: string;
  role: string;
  company: string;
  event: string;
  valuable: boolean;
};

export type PersonProfile = {
  person: DirectoryPerson;
  /** Full-size portrait for the profile panel. */
  portrait: string;
  location: string;
  category: string;
  bio: string;
  participation: readonly ParticipationDetail[];
  history: readonly EventHistoryEntry[];
  met: readonly MetConnection[];
  metTotal: number;
};

export const statusLabels: Record<PersonStatus, string> = {
  vip: "VIP",
  returning: "Returning",
  "first-time": "First time",
};

const directory: DirectoryPerson[] = [
  {
    id: "sarah-chen",
    name: "Sarah Chen",
    avatar: "/network/avatars/sarah-chen.png",
    initials: "SC",
    role: "Partner",
    company: "Northstar Capital",
    events: 4,
    goal: "Find AI founders",
    valuable: 8,
    nextEvent: { city: "Las Vegas", date: "Nov 19" },
    status: "vip",
  },
  {
    id: "michael-tan",
    name: "Michael Tan",
    avatar: "/network/avatars/michael-ross.png",
    initials: "MT",
    role: "Founder",
    company: "Arc Labs",
    events: 2,
    goal: "Meet investors",
    valuable: 3,
    nextEvent: { city: "Las Vegas", date: "Nov 19" },
    status: "returning",
  },
  {
    id: "anna-rossi",
    name: "Anna Rossi",
    avatar: "/network/avatars/anna-rossi.png",
    initials: "AR",
    role: "Brand Director",
    company: "Nike",
    events: 1,
    goal: "Partnerships",
    valuable: 2,
    nextEvent: { city: "Singapore", date: "Dec 4" },
    status: "first-time",
  },
  {
    id: "david-park",
    name: "David Park",
    avatar: "/network/avatars/daniel-park.png",
    initials: "DP",
    role: "Partner",
    company: "Horizon Ventures",
    events: 3,
    goal: "Meet climate founders",
    valuable: 6,
    nextEvent: { city: "Las Vegas", date: "Nov 19" },
    status: "returning",
  },
  {
    id: "elena-martinez",
    name: "Elena Martinez",
    avatar: "/network/avatars/sofia-martinez.png",
    initials: "EM",
    role: "Investor",
    company: "Blue Horizon",
    events: 2,
    goal: "Consumer brands",
    valuable: 4,
    nextEvent: { city: "Singapore", date: "Dec 4" },
    status: "returning",
  },
  {
    id: "james-wilson",
    name: "James Wilson",
    avatar: "/network/avatars/james-wong.png",
    initials: "JW",
    role: "Founder",
    company: "Velocity",
    events: 1,
    goal: "Meet operators",
    valuable: 1,
    nextEvent: { city: "Abu Dhabi", date: "Jan 15" },
    status: "first-time",
  },
  {
    id: "priya-mehta",
    name: "Priya Mehta",
    avatar: null,
    initials: "PM",
    role: "Investor",
    company: "SandHill Partners",
    events: 3,
    goal: "Deep tech founders",
    valuable: 7,
    nextEvent: { city: "Las Vegas", date: "Nov 19" },
    status: "vip",
  },
  {
    id: "carlos-vega",
    name: "Carlos Vega",
    avatar: "/network/avatars/alex-rivera.png",
    initials: "CV",
    role: "CEO",
    company: "Vega Holdings",
    events: 2,
    goal: "Strategic partnerships",
    valuable: 5,
    nextEvent: { city: "Miami", date: "Mar 3" },
    status: "returning",
  },
  {
    id: "sophie-laurent",
    name: "Sophie Laurent",
    avatar: "/network/avatars/emma-laurent.png",
    initials: "SL",
    role: "Partner",
    company: "Maison Capital",
    events: 4,
    goal: "Luxury brands",
    valuable: 6,
    nextEvent: { city: "Singapore", date: "Dec 4" },
    status: "vip",
  },
  {
    id: "daniel-kim",
    name: "Daniel Kim",
    avatar: "/network/avatars/david-kim.png",
    initials: "DK",
    role: "Founder",
    company: "Orbit",
    events: 1,
    goal: "Meet advisors",
    valuable: 2,
    nextEvent: { city: "Las Vegas", date: "Nov 19" },
    status: "first-time",
  },
];

const profile: PersonProfile = {
  person: directory[0],
  portrait: "/network/avatars/sarah-chen.png",
  location: "San Francisco, CA",
  category: "Investor",
  bio: "Investing in exceptional founders at the intersection of technology, society and human potential.",
  participation: [
    { icon: "calendar", label: "Next event", value: "Las Vegas · F1 Week", caption: "Nov 19, 2026" },
    { icon: "goal", label: "Goal", value: "Find AI founders" },
    { icon: "status", label: "Status", value: "VIP", tone: "status" },
    { icon: "registration", label: "Registration", value: "Confirmed", tone: "confirmed" },
  ],
  history: [
    { id: "austin", name: "Austin", date: "Mar 2026", introductions: 4, valuable: 3 },
    { id: "miami-art-week", name: "Miami Art Week", date: "Dec 2025", introductions: 5, valuable: 4 },
    { id: "monaco-gp", name: "Monaco GP", date: "May 2025", introductions: 3, valuable: 3 },
    { id: "singapore", name: "Singapore", date: "Oct 2024", introductions: 6, valuable: 4 },
  ],
  met: [
    {
      id: "michael-tan",
      name: "Michael Tan",
      avatar: "/network/avatars/michael-ross.png",
      role: "Founder",
      company: "Arc Labs",
      event: "Miami",
      valuable: true,
    },
    {
      id: "david-park",
      name: "David Park",
      avatar: "/network/avatars/daniel-park.png",
      role: "Partner",
      company: "Horizon Ventures",
      event: "Monaco",
      valuable: true,
    },
    {
      id: "anna-rossi",
      name: "Anna Rossi",
      avatar: "/network/avatars/anna-rossi.png",
      role: "Brand Director",
      company: "Nike",
      event: "Austin",
      valuable: false,
    },
  ],
  metTotal: 8,
};

export const peopleData = {
  subtitle: "1,840 people across 12 events",
  quickFilters: ["All people", "Upcoming", "Returning", "VIP", "Investors", "Founders", "Brands"],
  metrics: [
    { value: "1,840", label: "People", icon: "people" },
    { value: "572", label: "Returning attendees", description: "31% of total", icon: "return" },
    { value: "214", label: "Attended 3+ events", description: "12% of total", icon: "outcomes" },
    { value: "86", label: "Attending next event", description: "Las Vegas · Nov 19", icon: "calendar" },
  ] satisfies PeopleMetric[],
  directory,
  pagination: { showing: "Showing 1–10 of 1,840 people", pages: ["1", "2", "3"], lastPage: "184" },
  profile,
} as const;
