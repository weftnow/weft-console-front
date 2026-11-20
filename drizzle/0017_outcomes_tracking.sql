CREATE TABLE "event_match_completion_changes" (
	"event_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"completed" boolean NOT NULL,
	"changed_at" timestamp with time zone DEFAULT date_trunc('milliseconds', clock_timestamp()) NOT NULL,
	"changed_by" uuid NOT NULL,
	CONSTRAINT "event_match_completion_changes_event_id_match_id_revision_pk" PRIMARY KEY("event_id","match_id","revision"),
	CONSTRAINT "event_match_completion_changes_revision_positive" CHECK ("event_match_completion_changes"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "event_match_completions" (
	"event_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"revision" integer NOT NULL,
	CONSTRAINT "event_match_completions_event_id_match_id_pk" PRIMARY KEY("event_id","match_id"),
	CONSTRAINT "event_match_completions_revision_positive" CHECK ("event_match_completions"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "event_outcomes_tracking" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT date_trunc('milliseconds', clock_timestamp()) NOT NULL,
	"started_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_match_completion_changes" ADD CONSTRAINT "event_match_completion_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_completion_changes" ADD CONSTRAINT "event_match_completion_changes_completion_fk" FOREIGN KEY ("event_id","match_id") REFERENCES "public"."event_match_completions"("event_id","match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_completions" ADD CONSTRAINT "event_match_completions_tracking_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event_outcomes_tracking"("event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_completions" ADD CONSTRAINT "event_match_completions_match_fk" FOREIGN KEY ("match_id","event_id") REFERENCES "public"."event_matches"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outcomes_tracking" ADD CONSTRAINT "event_outcomes_tracking_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_outcomes_tracking" ADD CONSTRAINT "event_outcomes_tracking_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;