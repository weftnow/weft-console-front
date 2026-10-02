-- Preflight every condition required by the new constraints. This must stop
-- before changing any data so operators can inspect/fix the source records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM event_guests GROUP BY event_id, position HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: duplicate guest positions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_guests g
    LEFT JOIN event_attendee_imports i ON i.event_id = g.event_id
    WHERE g.source = 'csv' AND i.event_id IS NULL
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: CSV guests have no legacy import';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_attendee_imports i
    LEFT JOIN events e ON e.id = i.event_id
    WHERE e.id IS NULL OR i.imported_count < 0 OR i.stored_count < 0
      OR i.vip_count < 0 OR i.sponsor_count < 0
      OR i.imported_count < i.stored_count
      OR i.imported_count > 2000 OR i.stored_count > 2000
      OR i.vip_count + i.sponsor_count > i.stored_count
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: legacy import counts are inconsistent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_attendee_imports i
    LEFT JOIN event_guests g ON g.event_id = i.event_id AND g.source = 'csv'
    GROUP BY i.event_id, i.stored_count
    HAVING count(g.id) <> i.stored_count
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: legacy stored count differs from CSV guest rows';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_attendee_imports i
    LEFT JOIN event_guests g ON g.event_id = i.event_id AND g.source = 'csv'
    GROUP BY i.event_id, i.vip_count, i.sponsor_count
    HAVING count(g.id) FILTER (WHERE g.guest_type = 'VIP') <> i.vip_count
       OR count(g.id) FILTER (WHERE g.guest_type = 'Sponsor') <> i.sponsor_count
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: legacy guest type counts are inconsistent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_guests
    WHERE normalized_email IS DISTINCT FROM nullif(lower(btrim(email)), '')
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: normalized guest emails are inconsistent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM event_attendee_imports
    WHERE length(btrim(file_name)) NOT BETWEEN 1 AND 255
       OR file_name ~ '[[:cntrl:]]' OR position('/' in file_name) > 0
       OR position(chr(92) in file_name) > 0
  ) THEN
    RAISE EXCEPTION 'attendee_import_batches preflight: legacy file name is invalid';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "event_attendee_imports" DROP CONSTRAINT "event_import_file_valid";--> statement-breakpoint
ALTER TABLE "event_attendee_imports" DROP CONSTRAINT "event_import_counts_valid";--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "imported_by" uuid;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "fingerprint_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "duplicate_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD COLUMN "blank_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_guests" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE event_attendee_imports i
SET imported_by = e.creator_id,
    duplicate_count = i.imported_count - i.stored_count,
    blank_count = 0
FROM events e
WHERE e.id = i.event_id;--> statement-breakpoint
UPDATE event_guests g
SET import_id = i.id,
    created_at = e.created_at,
    updated_at = e.created_at
FROM event_attendee_imports i
JOIN events e ON e.id = i.event_id
WHERE g.event_id = i.event_id AND g.source = 'csv';--> statement-breakpoint
UPDATE event_guests g
SET created_at = e.created_at,
    updated_at = e.created_at
FROM events e
WHERE g.event_id = e.id AND g.source = 'manual';--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ALTER COLUMN "imported_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "event_guests" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_guests" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "event_guests" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
DO $$
DECLARE old_pk text;
BEGIN
  SELECT conname INTO old_pk FROM pg_constraint
  WHERE conrelid = 'event_attendee_imports'::regclass AND contype = 'p';
  IF old_pk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE event_attendee_imports DROP CONSTRAINT %I', old_pk);
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_attendee_imports_pkey" PRIMARY KEY("id");--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_attendee_imports_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_attendee_imports_id_event_unique" UNIQUE("id","event_id");--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_import_event_fk" FOREIGN KEY ("import_id","event_id") REFERENCES "public"."event_attendee_imports"("id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_guests_import_id_idx" ON "event_guests" USING btree ("import_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_attendee_imports_fingerprint_unique" ON "event_attendee_imports" USING btree ("event_id","fingerprint_version","content_hash") WHERE "event_attendee_imports"."content_hash" is not null;--> statement-breakpoint
CREATE INDEX "event_attendee_imports_history_idx" ON "event_attendee_imports" USING btree ("event_id","imported_at","id");--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_event_position_unique" UNIQUE("event_id","position");--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_import_fingerprint_valid" CHECK ("fingerprint_version" = 1 AND ("content_hash" IS NULL OR "content_hash" ~ '^[0-9a-f]{64}$'));--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_import_file_valid" CHECK (length(btrim("file_name")) BETWEEN 1 AND 255 AND "file_name" !~ '[\\/[:cntrl:]]');--> statement-breakpoint
ALTER TABLE "event_attendee_imports" ADD CONSTRAINT "event_import_counts_valid" CHECK ("imported_count" BETWEEN 0 AND 2000 AND "stored_count" BETWEEN 0 AND 2000 AND "duplicate_count" >= 0 AND "blank_count" >= 0 AND "imported_count" = "stored_count" + "duplicate_count" AND "vip_count" >= 0 AND "sponsor_count" >= 0 AND "vip_count" + "sponsor_count" <= "stored_count");--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_source_import_valid" CHECK (("source" = 'csv' AND "import_id" IS NOT NULL) OR ("source" = 'manual' AND "import_id" IS NULL));--> statement-breakpoint
ALTER TABLE "event_guests" ADD CONSTRAINT "event_guests_email_normalized_valid" CHECK ("normalized_email" IS NOT DISTINCT FROM nullif(lower(btrim("email")), ''));
