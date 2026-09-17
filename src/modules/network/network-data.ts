export type NetworkMetricIcon = "people" | "network" | "quality" | "return";

export type NetworkMetric = {
  value: string;
  label: string;
  description: string;
  icon: NetworkMetricIcon;
};

export type NetworkPerson = {
  id: string;
  name: string;
  role: string;
  company: string;
  category: string;
  avatar: string;
  avatarAlt: string;
};

export type ConnectionRecommendation = {
  id: string;
  people: readonly [NetworkPerson, NetworkPerson];
  match: number;
  reason: string;
  event: string;
  status: "Not introduced";
};

export type DirectConnection = {
  person: NetworkPerson;
  position: "top-left" | "bottom-left" | "top-right" | "bottom-right";
};

export type NetworkCompositionItem = {
  label: string;
  percentage: number;
  count: number;
  tone: "orange" | "graphite" | "charcoal" | "slate" | "ash" | "sand" | "cream";
};

export type IntroductionType = {
  label: string;
  count: number;
  progress: number;
};

export type ReturningEvent = {
  name: string;
  totalAttendees: number;
  returningAttendees: number;
  returnRate: number;
  theme: {
    horizon: string;
    image?: string;
    sky: string;
  };
};

const people = {
  sarah: {
    id: "sarah-chen",
    name: "Sarah Chen",
    role: "Partner",
    company: "Horizon Ventures",
    category: "Investor",
    avatar: "/network/avatars/sarah-chen.png",
    avatarAlt: "Portrait of Sarah Chen",
  },
  michael: {
    id: "michael-ross",
    name: "Michael Ross",
    role: "Founder & CEO",
    company: "Circuit",
    category: "Founder",
    avatar: "/network/avatars/michael-ross.png",
    avatarAlt: "Portrait of Michael Ross",
  },
  emma: {
    id: "emma-laurent",
    name: "Emma Laurent",
    role: "CMO",
    company: "Velvet Media",
    category: "Media",
    avatar: "/network/avatars/emma-laurent.png",
    avatarAlt: "Portrait of Emma Laurent",
  },
  daniel: {
    id: "daniel-park",
    name: "Daniel Park",
    role: "Co-Founder",
    company: "NextPlay",
    category: "Founder",
    avatar: "/network/avatars/daniel-park.png",
    avatarAlt: "Portrait of Daniel Park",
  },
  alex: {
    id: "alex-rivera",
    name: "Alex Rivera",
    role: "Managing Partner",
    company: "Summit Capital",
    category: "Investor",
    avatar: "/network/avatars/alex-rivera.png",
    avatarAlt: "Portrait of Alex Rivera",
  },
  sofia: {
    id: "sofia-martinez",
    name: "Sofia Martinez",
    role: "Founder",
    company: "Latitude",
    category: "Founder",
    avatar: "/network/avatars/sofia-martinez.png",
    avatarAlt: "Portrait of Sofia Martinez",
  },
  david: {
    id: "david-kim",
    name: "David Kim",
    role: "Founder",
    company: "Altitude",
    category: "Founder",
    avatar: "/network/avatars/david-kim.png",
    avatarAlt: "Portrait of David Kim",
  },
  anna: {
    id: "anna-rossi",
    name: "Anna Rossi",
    role: "CEO",
    company: "Rossi Collective",
    category: "Executive",
    avatar: "/network/avatars/anna-rossi.png",
    avatarAlt: "Portrait of Anna Rossi",
  },
  james: {
    id: "james-wong",
    name: "James Wong",
    role: "Founder",
    company: "Nidus",
    category: "Founder",
    avatar: "/network/avatars/james-wong.png",
    avatarAlt: "Portrait of James Wong",
  },
} satisfies Record<string, NetworkPerson>;

export const networkPageData = {
  metrics: [
    { value: "1,842", label: "People", description: "Total in ecosystem", icon: "people" },
    { value: "923", label: "Introductions", description: "Made through Weft", icon: "network" },
    { value: "68%", label: "Valuable connections", description: "Marked as valuable", icon: "quality" },
    { value: "412", label: "Returning attendees", description: "Came back to the same event", icon: "return" },
  ] satisfies NetworkMetric[],
  recommendations: [
    {
      id: "sarah-michael",
      people: [people.sarah, people.michael],
      match: 92,
      reason: "Sarah invests in sports technology. Michael is raising a Series A for a sports technology company.",
      event: "Las Vegas 2026",
      status: "Not introduced",
    },
    {
      id: "emma-daniel",
      people: [people.emma, people.daniel],
      match: 88,
      reason: "Emma is expanding media partnerships in the U.S. Daniel is building a sports media platform.",
      event: "London 2026",
      status: "Not introduced",
    },
    {
      id: "alex-sofia",
      people: [people.alex, people.sofia],
      match: 85,
      reason: "Alex focuses on Latin American founders. Sofia is expanding into the region.",
      event: "Miami 2026",
      status: "Not introduced",
    },
  ] satisfies ConnectionRecommendation[],
  explorer: {
    selected: people.sarah,
    connections: [
      { person: people.david, position: "top-left" },
      { person: people.anna, position: "bottom-left" },
      { person: people.michael, position: "top-right" },
      { person: people.james, position: "bottom-right" },
    ] satisfies DirectConnection[],
    summary: {
      introductions: 3,
      eventsTogether: 2,
      lastEvent: "Miami 2026",
    },
  },
  composition: [
    { label: "Founders", percentage: 35, count: 643, tone: "orange" },
    { label: "Investors", percentage: 16, count: 286, tone: "graphite" },
    { label: "Brands", percentage: 17, count: 312, tone: "sand" },
    { label: "Executives", percentage: 15, count: 281, tone: "slate" },
    { label: "Media", percentage: 6, count: 117, tone: "charcoal" },
    { label: "Family Offices", percentage: 5, count: 94, tone: "ash" },
    { label: "Others", percentage: 6, count: 109, tone: "cream" },
  ] satisfies NetworkCompositionItem[],
  introductionTypes: [
    { label: "Founder ↔ Investor", count: 182, progress: 90 },
    { label: "Founder ↔ Brand", count: 147, progress: 72 },
    { label: "Investor ↔ Investor", count: 83, progress: 46 },
    { label: "Founder ↔ Founder", count: 71, progress: 37 },
    { label: "Brand ↔ Investor", count: 64, progress: 31 },
  ] satisfies IntroductionType[],
  returningEvents: [
    { name: "Miami Art Week", totalAttendees: 142, returningAttendees: 24, returnRate: 17, theme: { sky: "#4f7fa9", horizon: "#f3a05b", image: "/miami.png" } },
    { name: "Monaco GP", totalAttendees: 118, returningAttendees: 19, returnRate: 16, theme: { sky: "#497498", horizon: "#e7843d", image: "/monaco.png" } },
    { name: "Las Vegas", totalAttendees: 186, returningAttendees: 28, returnRate: 15, theme: { sky: "#624a70", horizon: "#f07829", image: "/las_vegas.png" } },
    { name: "Singapore", totalAttendees: 94, returningAttendees: 11, returnRate: 12, theme: { sky: "#376b9d", horizon: "#f0a04a", image: "/singapore.png" } },
  ] satisfies ReturningEvent[],
};
