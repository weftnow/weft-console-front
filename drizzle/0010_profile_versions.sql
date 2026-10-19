ALTER TYPE "public"."event_matching_change_kind" ADD VALUE 'profile_updated';--> statement-breakpoint
CREATE TABLE "event_guest_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"summary" text,
	"goals" text,
	"offers" text,
	"desired_connections" text,
	"avoid" text,
	"background" text,
	"linkedin_details" text,
	"missing_details" text,
	"organizer_only_fields" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_guest_profile_versions_guest_version_unique" UNIQUE("guest_id","version"),
	CONSTRAINT "event_guest_profile_versions_version_valid" CHECK ("event_guest_profile_versions"."version" >= 1),
	CONSTRAINT "event_guest_profile_versions_summary_valid" CHECK ("event_guest_profile_versions"."summary" is null or (length("event_guest_profile_versions"."summary") between 1 and 500 and "event_guest_profile_versions"."summary" = btrim("event_guest_profile_versions"."summary"))),
	CONSTRAINT "event_guest_profile_versions_fields_valid" CHECK (("event_guest_profile_versions"."goals" is null or (length("event_guest_profile_versions"."goals") between 1 and 2000 and "event_guest_profile_versions"."goals" = btrim("event_guest_profile_versions"."goals"))) and ("event_guest_profile_versions"."offers" is null or (length("event_guest_profile_versions"."offers") between 1 and 2000 and "event_guest_profile_versions"."offers" = btrim("event_guest_profile_versions"."offers"))) and ("event_guest_profile_versions"."desired_connections" is null or (length("event_guest_profile_versions"."desired_connections") between 1 and 2000 and "event_guest_profile_versions"."desired_connections" = btrim("event_guest_profile_versions"."desired_connections"))) and ("event_guest_profile_versions"."avoid" is null or (length("event_guest_profile_versions"."avoid") between 1 and 2000 and "event_guest_profile_versions"."avoid" = btrim("event_guest_profile_versions"."avoid"))) and ("event_guest_profile_versions"."background" is null or (length("event_guest_profile_versions"."background") between 1 and 2000 and "event_guest_profile_versions"."background" = btrim("event_guest_profile_versions"."background"))) and ("event_guest_profile_versions"."linkedin_details" is null or (length("event_guest_profile_versions"."linkedin_details") between 1 and 2000 and "event_guest_profile_versions"."linkedin_details" = btrim("event_guest_profile_versions"."linkedin_details"))) and ("event_guest_profile_versions"."missing_details" is null or (length("event_guest_profile_versions"."missing_details") between 1 and 2000 and "event_guest_profile_versions"."missing_details" = btrim("event_guest_profile_versions"."missing_details")))),
	CONSTRAINT "event_guest_profile_versions_organizer_only_valid" CHECK ("event_guest_profile_versions"."organizer_only_fields" <@ ARRAY['goals','offers','desiredConnections','avoid','background','linkedinDetails','missingDetails']::text[])
);
--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "profile_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guest_profile_versions" ADD CONSTRAINT "event_guest_profile_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guest_profile_versions" ADD CONSTRAINT "event_guest_profile_versions_guest_fk" FOREIGN KEY ("guest_id","event_id") REFERENCES "public"."event_guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_guest_profile_versions_current_idx" ON "event_guest_profile_versions" USING btree ("event_id","guest_id","version" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_profile_version_valid" CHECK ("event_guests"."profile_version" >= 0);