import { z } from "zod";

const key = z.string().trim().min(1).max(80).regex(/^[a-z0-9][a-z0-9_-]*$/);
const uuid = z.uuid().transform((id) => id.toLowerCase());
const label = z.string().trim().min(1).max(120);
const item = z.object({ key, label }).strict();

export const connectionKinds = ["buyers", "investors", "peers", "partners", "talent", "other"] as const;
export const goalResults = ["achieved", "partial", "unmet"] as const;
export const demandReasons = ["no_candidate", "scheduling", "declined", "unknown"] as const;
export const sponsorMeasures = ["qualified", "meetings", "next_steps"] as const;

export const reportingEvidenceSchema = z.object({
  series: item.nullable().default(null),
  goalSurveyWindow: z.union([z.literal(7), z.literal(30)]).optional(),
  participants: z.array(z.object({
    personId: uuid,
    segment: label.optional(),
    networkKey: key.optional(),
    attended: z.boolean().optional(),
    surveyInvited: z.boolean().optional(),
    surveyResponded: z.boolean().optional(),
    goals: z.array(z.object({ kind: z.enum(connectionKinds), result: z.enum(goalResults).nullable() }).strict()).max(6).default([]),
  }).strict()).max(2000).default([]),
  requests: z.array(z.object({
    id: key,
    personId: uuid,
    kind: z.enum(connectionKinds),
    status: z.enum(["open", "fulfilled"]),
    reason: z.enum(demandReasons).optional(),
  }).strict()).max(12000).nullable().default(null),
  followUps: z.array(z.object({
    matchId: uuid,
    window: z.union([z.literal(7), z.literal(30)]),
    followUp: z.boolean().nullable(),
    secondMeeting: z.boolean().nullable(),
    opportunity: z.boolean().nullable(),
  }).strict()).max(12000).default([]),
  reconnections: z.array(z.tuple([uuid, uuid])).max(6000).default([]),
  sponsors: z.array(item.extend({
    objectives: z.array(item.extend({
      measure: z.enum(sponsorMeasures),
      target: z.number().int().positive().max(2000).nullable(),
      matchIds: z.array(uuid).max(2000),
      nextStep: z.string().trim().min(1).max(280).optional(),
    }).strict()).max(20),
  }).strict()).max(50).default([]),
}).strict();

export type ReportingEvidence = z.infer<typeof reportingEvidenceSchema>;
export type EvidenceDocument = { revision: number; evidence: ReportingEvidence };
export type ReportEvent = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  trackingStartedAt: string | null;
  evidence: ReportingEvidence | null;
  priorNetworkKeys?: string[];
  people: { personId: string; eligible: boolean; name: string }[];
  matches: {
    id: string;
    personIds: [string, string];
    method: "sms_coordination" | "wefter";
    completedAt: string | null;
  }[];
};

export const reportGroups = {
  event: ["goals", "demand", "follow-through", "coverage"],
  across: ["series", "relationships"],
  sponsors: ["sponsor-outcomes"],
} as const;

export type ReportView = keyof typeof reportGroups;
export type ReportId = (typeof reportGroups)[ReportView][number];
export type TrendMetric = "goals" | "coverage" | "follow-through";
export type ReportQuery = {
  view: ReportView;
  report?: ReportId;
  eventId?: string;
  series?: string;
  from?: string;
  to?: string;
  sponsor?: string;
  segment?: string;
  window: 7 | 30;
  metric: TrendMetric;
  detail?: string;
};

export type ReportCount = { count: number; total?: number };
export type ReportLabel = { text: string } | { key: string } | { date: string; timezone: string };
export type ReportDatum = { id: string; label: ReportLabel; values: (number | null)[]; counts?: ReportCount[]; href?: string };
export type ReportDetailRow = { id: string; cells: ReportLabel[]; href?: string };
export type ReportBreakdown = { columns: string[]; rows: ReportDetailRow[] };
export type ReportProjection = {
  id: ReportId;
  status: "ready" | "collecting" | "unavailable";
  measure?: ReportCount;
  responseCoverage?: ReportCount;
  delta?: number;
  basis?: "attendance" | "roster";
  columns: string[];
  rows: ReportDatum[];
  breakdown?: ReportBreakdown;
  details?: Record<string, ReportBreakdown>;
  matrix?: { id: string; label: string }[];
  options?: { key: string; label: string }[];
};

export type ReportsPageModel = {
  organizationName: string;
  query: ReportQuery;
  events: { id: string; name: string; endsAt: string }[];
  selectedEventId?: string;
  series: { key: string; label: string }[];
  sponsors: { key: string; label: string }[];
  projections: ReportProjection[];
};
