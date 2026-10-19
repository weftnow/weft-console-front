CREATE TYPE "public"."event_guest_exclusion_reason" AS ENUM('guest_request', 'organizer_decision', 'not_attending', 'other');--> statement-breakpoint
CREATE TYPE "public"."event_guest_networking_status" AS ENUM('included', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."event_matching_change_kind" AS ENUM('guest_excluded', 'guest_restored', 'match_block_added', 'match_block_removed');--> statement-breakpoint
CREATE TABLE "event_guest_match_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_low_id" uuid NOT NULL,
	"guest_high_id" uuid NOT NULL,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_guest_match_blocks_pair_unique" UNIQUE("event_id","guest_low_id","guest_high_id"),
	CONSTRAINT "event_guest_match_blocks_order_valid" CHECK ("event_guest_match_blocks"."guest_low_id" < "event_guest_match_blocks"."guest_high_id"),
	CONSTRAINT "event_guest_match_blocks_reason_valid" CHECK ("event_guest_match_blocks"."reason" is null or length("event_guest_match_blocks"."reason") <= 500)
);
--> statement-breakpoint
CREATE TABLE "event_matching_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" "event_matching_change_kind" NOT NULL,
	"guest_ids" uuid[] NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "event_matching_changes_guests_valid" CHECK (cardinality("event_matching_changes"."guest_ids") between 1 and 2),
	CONSTRAINT "event_matching_changes_reason_valid" CHECK ("event_matching_changes"."reason" is null or length("event_matching_changes"."reason") <= 500)
);
--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "networking_status" "event_guest_networking_status" DEFAULT 'included' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "networking_excluded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "networking_excluded_by" uuid;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "networking_exclusion_reason" "event_guest_exclusion_reason";--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "networking_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_id_event_unique" UNIQUE("id","event_id");--> statement-breakpoint
ALTER TABLE "event_guest_match_blocks" ADD CONSTRAINT "event_guest_match_blocks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guest_match_blocks" ADD CONSTRAINT "event_guest_match_blocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guest_match_blocks" ADD CONSTRAINT "event_guest_match_blocks_low_guest_fk" FOREIGN KEY ("guest_low_id","event_id") REFERENCES "public"."event_guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guest_match_blocks" ADD CONSTRAINT "event_guest_match_blocks_high_guest_fk" FOREIGN KEY ("guest_high_id","event_id") REFERENCES "public"."event_guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_matching_changes" ADD CONSTRAINT "event_matching_changes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_matching_changes" ADD CONSTRAINT "event_matching_changes_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_guest_match_blocks_high_idx" ON "event_guest_match_blocks" USING btree ("event_id","guest_high_id");--> statement-breakpoint
CREATE INDEX "event_matching_changes_pending_idx" ON "event_matching_changes" USING btree ("event_id","processed_at","created_at");--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_networking_excluded_by_users_id_fk" FOREIGN KEY ("networking_excluded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_networking_valid" CHECK (("event_guests"."networking_status" = 'excluded' and "event_guests"."networking_excluded_at" is not null and "event_guests"."networking_excluded_by" is not null and "event_guests"."networking_exclusion_reason" is not null) or ("event_guests"."networking_status" = 'included' and "event_guests"."networking_excluded_at" is null and "event_guests"."networking_excluded_by" is null and "event_guests"."networking_exclusion_reason" is null));--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_networking_version_valid" CHECK ("event_guests"."networking_version" >= 1);