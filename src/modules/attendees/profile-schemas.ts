import { z } from "zod";
import { uuidSchema } from "@/modules/events/event-schemas";

/** Matching information, in display order. `summary` is the shareable intro and is never organizer-only. */
export const PROFILE_FIELDS = ["summary", "goals", "offers", "desiredConnections", "avoid", "background", "linkedinDetails", "missingDetails"] as const;
export type ProfileFieldKey = (typeof PROFILE_FIELDS)[number];

/** Fields that feed matching and can be hidden from the shareable summary. Same list as the database check. */
export const ORGANIZER_ONLY_FIELDS = ["goals", "offers", "desiredConnections", "avoid", "background", "linkedinDetails", "missingDetails"] as const;
export type OrganizerOnlyFieldKey = (typeof ORGANIZER_ONLY_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<ProfileFieldKey, string> = {
  summary: "Shareable summary",
  goals: "Goals",
  offers: "Known offers",
  desiredConnections: "Desired connections",
  avoid: "People or situations to avoid",
  background: "Relevant background",
  linkedinDetails: "LinkedIn details",
  missingDetails: "Missing details",
};

export const PROFILE_FIELD_LIMITS: Record<ProfileFieldKey, number> = {
  summary: 500, goals: 2000, offers: 2000, desiredConnections: 2000,
  avoid: 2000, background: 2000, linkedinDetails: 2000, missingDetails: 2000,
};

export type ProfileFields = Record<ProfileFieldKey, string | null>;

/** Trim; blank means unknown and is stored as null, never as an empty string. */
const fieldSchema = (max: number) => z.string().trim().max(max, `Use ${max.toLocaleString("en-US")} characters or fewer.`).transform((value) => value || null).nullable();

const fieldsSchema = z.strictObject({
  summary: fieldSchema(PROFILE_FIELD_LIMITS.summary),
  goals: fieldSchema(PROFILE_FIELD_LIMITS.goals),
  offers: fieldSchema(PROFILE_FIELD_LIMITS.offers),
  desiredConnections: fieldSchema(PROFILE_FIELD_LIMITS.desiredConnections),
  avoid: fieldSchema(PROFILE_FIELD_LIMITS.avoid),
  background: fieldSchema(PROFILE_FIELD_LIMITS.background),
  linkedinDetails: fieldSchema(PROFILE_FIELD_LIMITS.linkedinDetails),
  missingDetails: fieldSchema(PROFILE_FIELD_LIMITS.missingDetails),
});

/** Keys in a fixed order without duplicates, so equal selections compare equal. */
export function normalizeOrganizerOnly(keys: readonly OrganizerOnlyFieldKey[]): OrganizerOnlyFieldKey[] {
  const selected = new Set(keys);
  return ORGANIZER_ONLY_FIELDS.filter((key) => selected.has(key));
}

const organizerOnlySchema = z.array(z.enum(ORGANIZER_ONLY_FIELDS)).max(ORGANIZER_ONLY_FIELDS.length).transform(normalizeOrganizerOnly);
const profileVersionSchema = z.number().int().min(0).max(2_147_483_647);

export const profileInputSchema = z.strictObject({
  fields: fieldsSchema,
  organizerOnly: organizerOnlySchema,
  expectedVersion: profileVersionSchema,
});

export const profileDtoSchema = z.strictObject({
  guestId: uuidSchema,
  /** 0 until the first save. */
  version: profileVersionSchema,
  fields: z.strictObject({
    summary: z.string().nullable(), goals: z.string().nullable(), offers: z.string().nullable(),
    desiredConnections: z.string().nullable(), avoid: z.string().nullable(), background: z.string().nullable(),
    linkedinDetails: z.string().nullable(), missingDetails: z.string().nullable(),
  }),
  organizerOnly: z.array(z.enum(ORGANIZER_ONLY_FIELDS)),
  savedAt: z.iso.datetime().nullable(),
  savedBy: z.string().nullable(),
});

export const profileCompletenessSchema = z.strictObject({
  goals: z.enum(["available", "missing"]),
  offers: z.enum(["available", "missing"]),
  desiredConnections: z.enum(["available", "missing"]),
  background: z.enum(["available", "missing"]),
  /** `url_only`: a LinkedIn URL is on file but no profile content was supplied. */
  linkedin: z.enum(["available", "url_only", "missing"]),
});

export const shareableSummarySchema = z.strictObject({
  summary: z.string().nullable(),
  details: z.array(z.strictObject({ key: z.enum(ORGANIZER_ONLY_FIELDS), label: z.string(), value: z.string() })),
});

export const profileReadSchema = z.strictObject({
  profile: profileDtoSchema,
  completeness: profileCompletenessSchema,
  summary: shareableSummarySchema,
});

export const profileResultSchema = z.strictObject({ data: profileReadSchema });
export const profileConflictSchema = z.strictObject({
  error: z.strictObject({ code: z.literal("CONFLICT"), message: z.string() }),
  data: z.strictObject({ profile: profileDtoSchema }),
});

export type ProfileInput = z.output<typeof profileInputSchema>;
export type ProfileDto = z.infer<typeof profileDtoSchema>;
export type ProfileCompleteness = z.infer<typeof profileCompletenessSchema>;
export type ShareableSummary = z.infer<typeof shareableSummarySchema>;
export type ProfileRead = z.infer<typeof profileReadSchema>;
