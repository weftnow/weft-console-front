CREATE TABLE "organization_auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text DEFAULT 'clerk' NOT NULL,
	"instance_id" text NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_auth_identity_provider_instance_subject_unique" UNIQUE("provider","instance_id","subject"),
	CONSTRAINT "organization_auth_identity_organization_instance_unique" UNIQUE("organization_id","provider","instance_id"),
	CONSTRAINT "organization_auth_identities_provider_check" CHECK ("organization_auth_identities"."provider" = 'clerk'),
	CONSTRAINT "organization_auth_identities_instance_nonempty" CHECK (length(btrim("organization_auth_identities"."instance_id")) > 0),
	CONSTRAINT "organization_auth_identities_subject_nonempty" CHECK (length(btrim("organization_auth_identities"."subject")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"instance_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"provider_invitation_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_state" text DEFAULT 'queued' NOT NULL,
	"delivery_lease_until" timestamp with time zone,
	"delivery_error_code" text,
	"provider_cleanup_pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_subject" text,
	"accepted_user_id" uuid,
	CONSTRAINT "organization_invitations_instance_nonempty" CHECK (length(btrim("organization_invitations"."instance_id")) > 0),
	CONSTRAINT "organization_invitations_email_normalized" CHECK ("organization_invitations"."email" = lower(btrim("organization_invitations"."email")) and length("organization_invitations"."email") between 1 and 254),
	CONSTRAINT "organization_invitations_role_check" CHECK ("organization_invitations"."role" in ('owner', 'organizer')),
	CONSTRAINT "organization_invitations_status_check" CHECK ("organization_invitations"."status" in ('pending', 'accepted', 'revoked', 'expired')),
	CONSTRAINT "organization_invitations_delivery_state_check" CHECK ("organization_invitations"."delivery_state" in ('queued', 'sending', 'sent', 'unknown', 'failed')),
	CONSTRAINT "organization_invitations_accepted_fields_coherent" CHECK (("organization_invitations"."status" = 'accepted' and "organization_invitations"."accepted_at" is not null and "organization_invitations"."accepted_subject" is not null and "organization_invitations"."accepted_user_id" is not null) or ("organization_invitations"."status" <> 'accepted' and "organization_invitations"."accepted_at" is null and "organization_invitations"."accepted_subject" is null and "organization_invitations"."accepted_user_id" is null))
);
--> statement-breakpoint
ALTER TABLE "organization_auth_identities" ADD CONSTRAINT "organization_auth_identities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_instance_provider_id_unique" ON "organization_invitations" USING btree ("instance_id","provider_invitation_id") WHERE "organization_invitations"."provider_invitation_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invitations_pending_email_unique" ON "organization_invitations" USING btree ("organization_id","instance_id","email") WHERE "organization_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "organization_invitations_organization_created_idx" ON "organization_invitations" USING btree ("organization_id","instance_id","created_at");