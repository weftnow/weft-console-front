CREATE TABLE "event_reporting_evidence" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_reporting_evidence_revision_positive" CHECK ("event_reporting_evidence"."revision" >= 1),
	CONSTRAINT "event_reporting_evidence_object" CHECK (jsonb_typeof("event_reporting_evidence"."evidence") = 'object')
);
--> statement-breakpoint
ALTER TABLE "event_reporting_evidence" ADD CONSTRAINT "event_reporting_evidence_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reporting_evidence" ADD CONSTRAINT "event_reporting_evidence_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;