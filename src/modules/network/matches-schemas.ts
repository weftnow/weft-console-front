import { z } from "zod";
import { uuidSchema } from "@/modules/events/event-schemas";
import { MATCH_REVOCATION_REASONS, matchRevocationReasonSchema } from "./matching-feed-schemas";
import { MATCHING_UNAVAILABLE_REASONS } from "./matching-status-schemas";

export const MATCH_STATUSES = ["active", "revoked"] as const;
export const matchStatusSchema = z.enum(MATCH_STATUSES);
export type MatchStatus = z.infer<typeof matchStatusSchema>;
export const INTRODUCTION_PATHS = ["sms_coordination", "wefter"] as const;
export const introductionPathSchema = z.enum(INTRODUCTION_PATHS);
export type IntroductionPath = z.infer<typeof introductionPathSchema>;

export const matchListQuerySchema = z.object({
  search: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  status: matchStatusSchema.optional(),
  introductionPath: introductionPathSchema.optional(),
  locale: z.enum(["en", "es"]).default("en"),
});

const timestamp = z.iso.datetime({ offset: true });
const guestTypeSchema = z.enum(["Attendee", "VIP", "Sponsor"]);

export const matchGuestSchema = z.strictObject({
  id: uuidSchema,
  name: z.string(),
  company: z.string(),
  jobPosition: z.string(),
  guestType: guestTypeSchema,
});

const summaryShape = {
  id: uuidSchema,
  status: matchStatusSchema,
  introductionPath: introductionPathSchema,
  pairScore: z.number().int().min(0).max(100),
  guests: z.tuple([matchGuestSchema, matchGuestSchema]),
  reasonPreview: z.string().nullable(),
  createdAt: timestamp,
  revokedAt: timestamp.nullable(),
  revocationReason: matchRevocationReasonSchema.nullable(),
};
export const matchSummarySchema = z.strictObject(summaryShape);
export type MatchSummaryDto = z.infer<typeof matchSummarySchema>;

const profileFieldsSchema = z.strictObject({
  summary: z.string().nullable(), goals: z.string().nullable(), offers: z.string().nullable(),
  desiredConnections: z.string().nullable(), background: z.string().nullable(),
});

export const matchDetailGuestSchema = matchGuestSchema.extend({
  participation: z.enum(["included", "excluded"]),
  benefit: z.string().nullable(),
  shareableReason: z.string().nullable(),
  missingInformation: z.array(z.string()),
  pinnedProfileVersion: z.number().int().min(0),
  currentProfileVersion: z.number().int().min(0),
  directionalScore: z.number().int().min(0).max(100),
  profile: profileFieldsSchema.nullable(),
});

export const matchDetailSchema = z.strictObject({
  ...summaryShape,
  guests: z.tuple([matchDetailGuestSchema, matchDetailGuestSchema]),
  uncertainty: z.string(),
  sourceRunId: uuidSchema.nullable(),
  evidence: z.array(z.record(z.string(), z.string())),
  restrictions: z.array(z.strictObject({ guestId: uuidSchema, otherGuestName: z.string(), reason: z.string().nullable() })),
  earlierIntroductions: z.array(z.strictObject({
    matchId: uuidSchema, guestId: uuidSchema, otherGuestName: z.string(), status: matchStatusSchema, createdAt: timestamp,
  })),
});
export type MatchDetailDto = z.infer<typeof matchDetailSchema>;

export const matchSyncNoteSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("synced") }),
  z.strictObject({ state: z.literal("unavailable"), reason: z.enum(MATCHING_UNAVAILABLE_REASONS) }),
]);
export type MatchSyncNote = z.infer<typeof matchSyncNoteSchema>;

export const matchListSchema = z.strictObject({
  matches: z.array(matchSummarySchema),
  counts: z.strictObject({ active: z.number().int().min(0), revoked: z.number().int().min(0) }),
  pagination: z.strictObject({ page: z.number().int().min(1), pageSize: z.number().int().min(1), total: z.number().int().min(0) })
    .default({ page: 1, pageSize: 25, total: 0 }),
  sync: matchSyncNoteSchema,
  /** Present only while the Console runs the matching simulation (demo data). */
  simulated: z.literal(true).optional(),
});
export type MatchListDto = z.infer<typeof matchListSchema>;

export const matchListResponseSchema = z.strictObject({ data: matchListSchema });
export const matchDetailResponseSchema = z.strictObject({ data: z.strictObject({ match: matchDetailSchema }) });

export { MATCH_REVOCATION_REASONS };
