CREATE TABLE "event_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_people_id_event_unique" UNIQUE("id","event_id")
);
--> statement-breakpoint
DROP INDEX "event_guests_event_email_unique";--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "person_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "normalized_phone" text;--> statement-breakpoint
INSERT INTO "event_people" ("id", "event_id", "created_at") SELECT "person_id", "event_id", "created_at" FROM "event_guests";--> statement-breakpoint
UPDATE "event_guests" SET "normalized_phone" = CASE WHEN "phone" ~ '^\+?[0-9]([0-9 ()().-]*[0-9])?$' AND length(regexp_replace("phone", '[^0-9]', '', 'g')) BETWEEN 7 AND 15 THEN nullif(regexp_replace("phone", '[^+0-9]', '', 'g'), '') ELSE NULL END;--> statement-breakpoint
ALTER TABLE "event_guests" ALTER COLUMN "person_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "event_people" ADD CONSTRAINT "event_people_event_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_person_event_fk" FOREIGN KEY ("person_id","event_id") REFERENCES "public"."event_people"("id","event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_guests_event_email_idx" ON "event_guests" USING btree ("event_id","normalized_email");--> statement-breakpoint
CREATE INDEX "event_guests_event_phone_idx" ON "event_guests" USING btree ("event_id","normalized_phone");--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_phone_normalized_valid" CHECK ("event_guests"."normalized_phone" is not distinct from case when "event_guests"."phone" ~ '^\+?[0-9]([0-9 ()().-]*[0-9])?$' and length(regexp_replace("event_guests"."phone", '[^0-9]', '', 'g')) between 7 and 15 then nullif(regexp_replace("event_guests"."phone", '[^+0-9]', '', 'g'), '') else null end);--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_revision_positive" CHECK ("event_guests"."revision" >= 1);
