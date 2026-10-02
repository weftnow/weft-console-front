CREATE TABLE "user_auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'clerk' NOT NULL,
	"instance_id" text NOT NULL,
	"subject" text NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_provider_instance_subject_unique" UNIQUE("provider","instance_id","subject"),
	CONSTRAINT "identity_user_provider_instance_unique" UNIQUE("user_id","provider","instance_id"),
	CONSTRAINT "user_auth_identities_provider_check" CHECK ("user_auth_identities"."provider" = 'clerk'),
	CONSTRAINT "user_auth_identities_instance_nonempty" CHECK (length(btrim("user_auth_identities"."instance_id")) > 0),
	CONSTRAINT "user_auth_identities_subject_nonempty" CHECK (length(btrim("user_auth_identities"."subject")) > 0)
);
--> statement-breakpoint
ALTER TABLE "user_auth_identities" ADD CONSTRAINT "user_auth_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;