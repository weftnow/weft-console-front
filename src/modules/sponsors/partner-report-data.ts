import { eventsData } from "@/modules/events/events-data";
import type { CityArt } from "@/shared/ui/city-artwork";

/**
 * Mock data for the partner event outcomes report.
 * Presentation only — no queries, mutations, filtering or export behaviour yet.
 */

export type PartnerMetricIcon = "people" | "link" | "calendar" | "star";

export interface PartnerMetric {
  icon: PartnerMetricIcon;
  value: string;
  label: string;
  trend: string;
  comparison: string;
  /** Renders the card with the accent treatment reserved for the headline outcome. */
  emphasis?: boolean;
}

export interface PartnerGoal {
  label: string;
  completed: boolean;
}

export interface PipelineStage {
  value: number;
  label: string;
  /** Share of the tallest stage, 0 to 1. */
  ratio: number;
}

export type OutcomeTone = "positive" | "active" | "neutral";

export interface OutcomeLabel {
  label: string;
  tone: OutcomeTone;
}

export interface InvestmentOpportunity {
  id: string;
  company: string;
  glyph: "target" | "sparkles" | "wellness";
  mark: "graphite" | "rose";
  opportunity: string;
  stage: string;
  relevance: string;
  status: OutcomeLabel;
}

export interface MetPerson {
  id: string;
  name: string;
  avatar: string;
  company: string;
  role: string;
  reason: string;
  outcome: OutcomeLabel;
}

export interface PeopleSegment {
  label: string;
  count: number;
}

export interface ImpactStat {
  icon: "target" | "idea" | "star" | "people";
  value: string;
  label: string;
}

export interface FollowUp {
  id: string;
  name: string;
  avatar: string;
  company: string;
  action: string;
  date: string;
  /** Highlights the date when the action is due immediately. */
  imminent?: boolean;
}

const event = eventsData.live;

/** Portraits reuse the shared mock avatar library in `public/network/avatars`. */
const portraits = {
  sarahChen: "/network/avatars/sarah-chen.png",
  michaelRoss: "/network/avatars/michael-ross.png",
  danielLee: "/network/avatars/daniel-park.png",
  emmaCarter: "/network/avatars/emma-laurent.png",
  jamesWilson: "/network/avatars/james-wong.png",
};

export const partnerReportData = {
  partner: {
    name: "Horizon Family Office",
    /** Wordmark split the way the report sets it, over two lines. */
    wordmark: ["Horizon", "Family Office"],
    principles: "Invest · Build · Generations",
    promise: ["People.", "Ideas.", "Opportunities.", "A stronger tomorrow."],
  },
  event: {
    city: "Las Vegas",
    edition: "F1 Week",
    dates: event.dates,
    location: event.location,
    art: event.art as CityArt,
  },
  metrics: [
    {
      icon: "people",
      value: "18",
      label: "Relevant people identified",
      trend: "+125%",
      comparison: "vs. last event",
    },
    {
      icon: "link",
      value: "11",
      label: "Introductions completed",
      trend: "+57%",
      comparison: "vs. last event",
    },
    {
      icon: "calendar",
      value: "7",
      label: "Follow ups requested",
      trend: "+40%",
      comparison: "vs. last event",
    },
    {
      icon: "star",
      value: "3",
      label: "Active opportunities",
      trend: "+200%",
      comparison: "vs. last event",
      emphasis: true,
    },
  ] satisfies PartnerMetric[],
  goals: {
    items: [
      { label: "Meet founders raising Series A or B", completed: true },
      { label: "Find co-investment opportunities", completed: true },
      { label: "Meet other family offices", completed: true },
      { label: "Explore sports and entertainment investments", completed: false },
    ] satisfies PartnerGoal[],
    achieved: 3,
    total: 4,
  },
  pipeline: {
    scope: "Introductions → Opportunities",
    scopeOptions: [
      "Introductions → Opportunities",
      "Identified → Introduced",
      "Conversations → Follow ups",
    ],
    stages: [
      { value: 18, label: "Identified", ratio: 1 },
      { value: 11, label: "Introduced", ratio: 0.64 },
      { value: 7, label: "Valuable conversations", ratio: 0.43 },
      { value: 7, label: "Follow ups", ratio: 0.4 },
      { value: 3, label: "Opportunities", ratio: 0.14 },
    ] satisfies PipelineStage[],
  },
  opportunities: [
    {
      id: "apex-sports",
      company: "Apex Sports",
      glyph: "target",
      mark: "graphite",
      opportunity: "Sports infrastructure platform",
      stage: "Series A",
      relevance: "Matches investment thesis",
      status: { label: "Meeting scheduled", tone: "positive" },
    },
    {
      id: "nova-ai",
      company: "Nova AI",
      glyph: "sparkles",
      mark: "graphite",
      opportunity: "Enterprise AI",
      stage: "Series B",
      relevance: "Strong revenue growth",
      status: { label: "Reviewing deck", tone: "active" },
    },
    {
      id: "stride",
      company: "Stride",
      glyph: "wellness",
      mark: "rose",
      opportunity: "Consumer wellness",
      stage: "Seed",
      relevance: "Strategic portfolio fit",
      status: { label: "Intro completed", tone: "neutral" },
    },
  ] satisfies InvestmentOpportunity[],
  people: {
    total: 11,
    segments: [
      { label: "All", count: 11 },
      { label: "Founders", count: 5 },
      { label: "Family Offices", count: 3 },
      { label: "VC / Funds", count: 2 },
      { label: "Strategic Partners", count: 1 },
    ] satisfies PeopleSegment[],
    met: [
      {
        id: "sarah-chen",
        name: "Sarah Chen",
        avatar: portraits.sarahChen,
        company: "Apex Sports",
        role: "CEO",
        reason: "Raising Series A, sports infrastructure",
        outcome: { label: "Follow up", tone: "positive" },
      },
      {
        id: "michael-ross",
        name: "Michael Ross",
        avatar: portraits.michaelRoss,
        company: "Atlas Family Office",
        role: "Managing Partner",
        reason: "Aligned investment focus",
        outcome: { label: "Meeting", tone: "active" },
      },
      {
        id: "daniel-lee",
        name: "Daniel Lee",
        avatar: portraits.danielLee,
        company: "Northstar Ventures",
        role: "Partner",
        reason: "Potential co-investment",
        outcome: { label: "Follow up", tone: "positive" },
      },
      {
        id: "emma-carter",
        name: "Emma Carter",
        avatar: portraits.emmaCarter,
        company: "Stride",
        role: "Founder",
        reason: "Consumer wellness, Seed",
        outcome: { label: "Intro completed", tone: "neutral" },
      },
      {
        id: "james-wilson",
        name: "James Wilson",
        avatar: portraits.jamesWilson,
        company: "Endeavor Group",
        role: "Head of M&A",
        reason: "Strategic partnership opportunity",
        outcome: { label: "Follow up", tone: "positive" },
      },
    ] satisfies MetPerson[],
  },
  impact: {
    stats: [
      { icon: "target", value: "3", label: "Investment opportunities" },
      { icon: "idea", value: "1", label: "Potential co-investment" },
      { icon: "star", value: "2", label: "Strategic relationships" },
      { icon: "people", value: "4", label: "Meetings scheduled" },
    ] satisfies ImpactStat[],
    quote:
      "High quality introductions and relevant opportunities. Weft made it easy to meet the right people.",
  },
  followUps: [
    {
      id: "sarah-chen",
      name: "Sarah Chen",
      avatar: portraits.sarahChen,
      company: "Apex Sports",
      action: "Review investment deck",
      date: "Tomorrow",
      imminent: true,
    },
    {
      id: "michael-ross",
      name: "Michael Ross",
      avatar: portraits.michaelRoss,
      company: "Atlas Family Office",
      action: "Schedule co-investment call",
      date: "Sep 24, 2026",
    },
    {
      id: "daniel-lee",
      name: "Daniel Lee",
      avatar: portraits.danielLee,
      company: "Northstar Ventures",
      action: "Send investment thesis",
      date: "Sep 25, 2026",
    },
  ] satisfies FollowUp[],
};
