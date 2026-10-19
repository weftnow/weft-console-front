-- Reconcile databases that applied main's later-timestamp F04/F05 before Console F01–F03.
-- Existing migration SQL hashes/timestamps are preserved; add only missing capabilities.
DO $reconcile$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_staff' AND column_name='console_access') THEN
CREATE TYPE "public"."event_console_access" AS ENUM('operator', 'wefter');

ALTER TABLE "event_staff" ADD COLUMN "console_access" "event_console_access";

ALTER TABLE "event_staff" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;

ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_revision_positive" CHECK ("event_staff"."revision" >= 1);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='organization_invitations_role_check' AND conrelid='public.organization_invitations'::regclass AND position('''staff''' in pg_get_constraintdef(oid))=0) THEN
ALTER TABLE "organization_invitations" DROP CONSTRAINT "organization_invitations_role_check";

ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_role_check" CHECK ("organization_invitations"."role" in ('owner', 'organizer', 'staff'));
  END IF;
  IF to_regclass('public.event_networking_settings') IS NULL THEN
CREATE TABLE "event_networking_settings" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"settings" jsonb NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_networking_settings_revision_positive" CHECK ("event_networking_settings"."revision" >= 1)
);


ALTER TABLE "event_staff" ADD COLUMN "availability_windows" jsonb DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE "event_staff" ADD COLUMN "updated_by" uuid;

ALTER TABLE "event_staff" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

ALTER TABLE "event_networking_settings" ADD CONSTRAINT "event_networking_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "event_networking_settings" ADD CONSTRAINT "event_networking_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_guests' AND column_name='person_id') THEN
CREATE TABLE "event_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_people_id_event_unique" UNIQUE("id","event_id")
);


DROP INDEX "event_guests_event_email_unique";

ALTER TABLE "event_guests" ADD COLUMN "person_id" uuid DEFAULT gen_random_uuid() NOT NULL;

ALTER TABLE "event_guests" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;

ALTER TABLE "event_guests" ADD COLUMN "normalized_phone" text;

INSERT INTO "event_people" ("id", "event_id", "created_at") SELECT "person_id", "event_id", "created_at" FROM "event_guests";

UPDATE "event_guests" SET "normalized_phone" = CASE WHEN "phone" ~ '^\+?[0-9]([0-9 ()().-]*[0-9])?$' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) BETWEEN 7 AND 15 THEN nullif(regexp_replace("phone", '[^+0-9]', '', 'g'), '') ELSE NULL END;

ALTER TABLE "event_guests" ALTER COLUMN "person_id" DROP DEFAULT;

ALTER TABLE "event_people" ADD CONSTRAINT "event_people_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_person_event_fk" FOREIGN KEY ("person_id","event_id") REFERENCES "public"."event_people"("id","event_id") ON DELETE restrict ON UPDATE no action;

CREATE INDEX "event_guests_event_email_idx" ON "event_guests" USING btree ("event_id","normalized_email");

CREATE INDEX "event_guests_event_phone_idx" ON "event_guests" USING btree ("event_id","normalized_phone");

ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_phone_normalized_valid" CHECK ("event_guests"."normalized_phone" is not distinct from case when "event_guests"."phone" ~ '^\+?[0-9]([0-9 ()().-]*[0-9])?$' and length(regexp_replace("event_guests"."phone", '[^0-9]', '', 'g')) between 7 and 15 then nullif(regexp_replace("event_guests"."phone", '[^+0-9]', '', 'g'), '') else null end);

ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_revision_positive" CHECK ("event_guests"."revision" >= 1);

  END IF;
END
$reconcile$;
