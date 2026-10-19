CREATE TYPE "public"."event_match_introduction_path" AS ENUM('sms_coordination', 'wefter');--> statement-breakpoint
CREATE TYPE "public"."event_match_revocation_reason" AS ENUM('guest_excluded', 'pair_blocked', 'identity_resolution_required', 'guest_missing');--> statement-breakpoint
CREATE TYPE "public"."event_match_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "event_match_feed_cursors" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"checked_through_run_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_match_feed_cursors_seq_valid" CHECK ("event_match_feed_cursors"."last_seq" >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_low_id" uuid NOT NULL,
	"guest_high_id" uuid NOT NULL,
	"engine_recommendation_id" uuid NOT NULL,
	"source_run_id" uuid,
	"profile_version_low" integer NOT NULL,
	"profile_version_high" integer NOT NULL,
	"score_low" integer NOT NULL,
	"score_high" integer NOT NULL,
	"pair_score" integer NOT NULL,
	"benefits" jsonb NOT NULL,
	"shareable_reasons" jsonb NOT NULL,
	"missing_information" jsonb NOT NULL,
	"evidence" jsonb NOT NULL,
	"uncertainty" text NOT NULL,
	"introduction_path" "event_match_introduction_path" NOT NULL,
	"status" "event_match_status" DEFAULT 'active' NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" "event_match_revocation_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_matches_pair_unique" UNIQUE("event_id","guest_low_id","guest_high_id"),
	CONSTRAINT "event_matches_recommendation_unique" UNIQUE("event_id","engine_recommendation_id"),
	CONSTRAINT "event_matches_id_event_unique" UNIQUE("id","event_id"),
	CONSTRAINT "event_matches_order_valid" CHECK ("event_matches"."guest_low_id" < "event_matches"."guest_high_id"),
	CONSTRAINT "event_matches_scores_valid" CHECK ("event_matches"."score_low" between 0 and 100 and "event_matches"."score_high" between 0 and 100 and "event_matches"."pair_score" between 0 and 100),
	CONSTRAINT "event_matches_profile_versions_valid" CHECK ("event_matches"."profile_version_low" >= 0 and "event_matches"."profile_version_high" >= 0),
	CONSTRAINT "event_matches_revocation_valid" CHECK (("event_matches"."status" = 'active' and "event_matches"."revoked_at" is null and "event_matches"."revocation_reason" is null) or ("event_matches"."status" = 'revoked' and "event_matches"."revoked_at" is not null and "event_matches"."revocation_reason" is not null))
);
--> statement-breakpoint
ALTER TABLE "event_match_feed_cursors" ADD CONSTRAINT "event_match_feed_cursors_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_matches" ADD CONSTRAINT "event_matches_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_matches" ADD CONSTRAINT "event_matches_low_guest_fk" FOREIGN KEY ("guest_low_id","event_id") REFERENCES "public"."event_guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_matches" ADD CONSTRAINT "event_matches_high_guest_fk" FOREIGN KEY ("guest_high_id","event_id") REFERENCES "public"."event_guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_matches_event_status_idx" ON "event_matches" USING btree ("event_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_matches_high_idx" ON "event_matches" USING btree ("event_id","guest_high_id");