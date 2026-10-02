CREATE TYPE "public"."membership_role" AS ENUM('owner', 'organizer', 'staff', 'sponsor');--> statement-breakpoint
CREATE TYPE "public"."event_guest_source" AS ENUM('csv', 'manual');--> statement-breakpoint
CREATE TYPE "public"."event_guest_type" AS ENUM('Attendee', 'VIP', 'Sponsor');--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "memberships_organization_user_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "memberships_id_organization_unique" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_name_valid" CHECK (length(btrim("organizations"."name")) between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_name_valid" CHECK (length(btrim("users"."display_name")) between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "event_attendee_imports" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"imported_count" integer NOT NULL,
	"stored_count" integer NOT NULL,
	"vip_count" integer NOT NULL,
	"sponsor_count" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_import_file_valid" CHECK (length(btrim("event_attendee_imports"."file_name")) between 1 and 255),
	CONSTRAINT "event_import_counts_valid" CHECK ("event_attendee_imports"."imported_count" >= 0 and "event_attendee_imports"."stored_count" >= 0 and "event_attendee_imports"."stored_count" <= "event_attendee_imports"."imported_count" and "event_attendee_imports"."vip_count" >= 0 and "event_attendee_imports"."sponsor_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "event_covers" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL,
	"mime_type" text DEFAULT 'image/webp' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_covers_size_valid" CHECK (octet_length("event_covers"."bytes") between 1 and 262144),
	CONSTRAINT "event_covers_mime_valid" CHECK ("event_covers"."mime_type" = 'image/webp')
);
--> statement-breakpoint
CREATE TABLE "event_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text,
	"phone" text NOT NULL,
	"company" text NOT NULL,
	"job_position" text NOT NULL,
	"profile_type" text NOT NULL,
	"linkedin" text NOT NULL,
	"guest_type" "event_guest_type" NOT NULL,
	"source" "event_guest_source" NOT NULL,
	CONSTRAINT "event_guests_position_valid" CHECK ("event_guests"."position" >= 0),
	CONSTRAINT "event_guests_name_valid" CHECK (length("event_guests"."first_name") <= 100 and length("event_guests"."last_name") <= 100 and length(btrim("event_guests"."first_name" || "event_guests"."last_name")) > 0),
	CONSTRAINT "event_guests_contact_valid" CHECK (length("event_guests"."email") <= 254 and length("event_guests"."phone") <= 40 and length("event_guests"."company") <= 200 and length("event_guests"."job_position") <= 200 and length("event_guests"."profile_type") <= 100 and length("event_guests"."linkedin") <= 500)
);
--> statement-breakpoint
CREATE TABLE "event_staff" (
	"event_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	CONSTRAINT "event_staff_event_id_membership_id_pk" PRIMARY KEY("event_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"city" text NOT NULL,
	"venue" text,
	"expected_attendees" integer,
	"categories" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"expected_audience" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" time,
	"end_time" time,
	"timezone" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_id_organization_unique" UNIQUE("id","organization_id"),
	CONSTRAINT "events_name_valid" CHECK (length(btrim("events"."name")) between 1 and 160),
	CONSTRAINT "events_description_valid" CHECK (length(btrim("events"."description")) between 1 and 500),
	CONSTRAINT "events_venue_valid" CHECK ("events"."venue" is null or length("events"."venue") <= 200),
	CONSTRAINT "events_estimate_valid" CHECK ("events"."expected_attendees" is null or "events"."expected_attendees" between 0 and 1000000),
	CONSTRAINT "events_date_order" CHECK ("events"."end_date" >= "events"."start_date" and "events"."ends_at" > "events"."starts_at"),
	CONSTRAINT "events_city_allowed" CHECK ("events"."city" in ('Las Vegas, USA','Singapore','Davos, Switzerland','Aspen, USA','Monaco')),
	CONSTRAINT "events_categories_allowed" CHECK (cardinality("events"."categories") > 0 and "events"."categories" <@ ARRAY['Sports','Luxury','Investing','Startups','Technology','Entertainment','Web3','Real Estate','Fashion','Media']::text[]),
	CONSTRAINT "events_audience_allowed" CHECK ("events"."expected_audience" <@ ARRAY['Founders','Investors','Family Offices','Executives','Brands','Sponsors','Creators','Media','Athletes','Government','Service Providers']::text[])
);
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_attendee_imports_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_covers" ADD CONSTRAINT "event_covers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_org_fk" FOREIGN KEY ("event_id","organization_id") REFERENCES "public"."events"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_membership_org_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."organization_memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_user_active_idx" ON "organization_memberships" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "event_guests_event_position_idx" ON "event_guests" USING btree ("event_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "event_guests_event_email_unique" ON "event_guests" USING btree ("event_id","normalized_email") WHERE "event_guests"."normalized_email" is not null;--> statement-breakpoint
CREATE INDEX "event_staff_membership_idx" ON "event_staff" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "events_organization_start_id_idx" ON "events" USING btree ("organization_id","starts_at","id");--> statement-breakpoint
CREATE INDEX "events_creator_idx" ON "events" USING btree ("creator_id");