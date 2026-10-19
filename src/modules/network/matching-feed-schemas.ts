import { z } from "zod";
import { uuidSchema } from "@/modules/events/event-schemas";

export const MATCH_REVOCATION_REASONS = ["guest_excluded", "pair_blocked", "identity_resolution_required", "guest_missing"] as const;
export const matchRevocationReasonSchema = z.enum(MATCH_REVOCATION_REASONS);
export type MatchRevocationReason = z.infer<typeof matchRevocationReasonSchema>;

const timestampSchema = z.iso.datetime({ offset: true });
const text = (max: number) => z.string().max(max);
const score = z.number().int().min(0).max(100);

/** Engine `ResultItem`. Maps are keyed by guest id; the refinement below requires exactly the two pair members. */
const recommendationSchema = z.object({
  recommendationId: uuidSchema,
  guestLowId: uuidSchema,
  guestHighId: uuidSchema,
  profileVersions: z.record(uuidSchema, z.number().int().min(0).max(1_000_000)),
  directionalScores: z.record(uuidSchema, score),
  pairScore: score,
  benefits: z.record(uuidSchema, text(2_000).nullable()),
  evidence: z.array(z.record(z.string().max(40), text(1_000))).max(50),
  missingInformation: z.record(uuidSchema, z.array(text(500)).max(30)),
  uncertainty: text(2_000),
  shareableReasons: z.record(uuidSchema, text(2_000).nullable()),
  revokedAt: timestampSchema.nullable(),
  revocationReason: matchRevocationReasonSchema.nullable(),
}).superRefine((item, context) => {
  if (!(item.guestLowId < item.guestHighId)) context.addIssue({ code: "custom", message: "Pair members must be ordered." });
  const expected = [item.guestLowId, item.guestHighId].sort().join();
  for (const key of ["profileVersions", "directionalScores", "benefits", "missingInformation", "shareableReasons"] as const) {
    if (Object.keys(item[key]).sort().join() !== expected) context.addIssue({ code: "custom", message: `${key} must name exactly the pair.`, path: [key] });
  }
  if ((item.revokedAt === null) !== (item.revocationReason === null)) context.addIssue({ code: "custom", message: "Revocation fields must be set together." });
});

export const feedEntrySchema = z.object({
  seq: z.number().int().min(1).max(2_147_483_647),
  kind: z.enum(["issued", "revoked"]),
  runId: uuidSchema.nullable(),
  recommendation: recommendationSchema,
}).superRefine((entry, context) => {
  if (entry.kind === "revoked" && entry.recommendation.revocationReason === null) {
    context.addIssue({ code: "custom", message: "A revoked entry needs a reason.", path: ["recommendation"] });
  }
});

/** Engine `FeedResponse`; extra engine fields are ignored. At most 200 entries, in ascending `seq` order. */
export const engineMatchingFeedSchema = z.object({
  entries: z.array(feedEntrySchema).max(200),
  nextCursor: z.number().int().min(0).max(2_147_483_647),
}).superRefine((feed, context) => {
  feed.entries.forEach((entry, index) => {
    if (index > 0 && entry.seq <= feed.entries[index - 1].seq) context.addIssue({ code: "custom", message: "Entries must ascend by seq.", path: ["entries", index] });
  });
  if (feed.entries.length > 0 && feed.nextCursor < feed.entries[feed.entries.length - 1].seq) {
    context.addIssue({ code: "custom", message: "The cursor cannot move behind the last entry.", path: ["nextCursor"] });
  }
});

export type MatchingFeed = z.infer<typeof engineMatchingFeedSchema>;
export type MatchingFeedEntry = z.infer<typeof feedEntrySchema>;
export type MatchingFeedRecommendation = MatchingFeedEntry["recommendation"];

export type MatchingFeedResult =
  | { availability: "available"; feed: MatchingFeed }
  | { availability: "unavailable"; reason: "not_configured" | "unreachable" | "invalid_response" };
