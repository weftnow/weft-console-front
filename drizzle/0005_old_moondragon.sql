CREATE TYPE "public"."event_console_access" AS ENUM('operator', 'wefter');--> statement-breakpoint
ALTER TABLE "event_staff" ADD COLUMN "console_access" "event_console_access";--> statement-breakpoint
ALTER TABLE "event_staff" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_revision_positive" CHECK ("event_staff"."revision" >= 1);