CREATE TABLE "customer_owner_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"instance_id" text NOT NULL,
	"provider_invitation_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_state" text DEFAULT 'queued' NOT NULL,
	"delivery_lease_until" timestamp with time zone,
	"delivery_lease_generation" integer DEFAULT 0 NOT NULL,
	"delivery_error_code" text,
	"provider_cleanup_pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_subject" text,
	"accepted_user_id" uuid,
	CONSTRAINT "customer_owner_invitations_instance_nonempty" CHECK (length(btrim("customer_owner_invitations"."instance_id")) > 0),
	CONSTRAINT "customer_owner_invitations_status_check" CHECK ("customer_owner_invitations"."status" in ('pending', 'accepted', 'revoked', 'expired')),
	CONSTRAINT "customer_owner_invitations_delivery_state_check" CHECK ("customer_owner_invitations"."delivery_state" in ('queued', 'sending', 'sent', 'unknown', 'failed')),
	CONSTRAINT "customer_owner_invitations_lease_generation_nonnegative" CHECK ("customer_owner_invitations"."delivery_lease_generation" >= 0),
	CONSTRAINT "customer_owner_invitations_accepted_fields_coherent" CHECK (("customer_owner_invitations"."status" = 'accepted' and "customer_owner_invitations"."accepted_at" is not null and "customer_owner_invitations"."accepted_subject" is not null and "customer_owner_invitations"."accepted_user_id" is not null) or ("customer_owner_invitations"."status" <> 'accepted' and "customer_owner_invitations"."accepted_at" is null and "customer_owner_invitations"."accepted_subject" is null and "customer_owner_invitations"."accepted_user_id" is null))
);
--> statement-breakpoint
CREATE TABLE "customer_provisionings" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"instance_id" text NOT NULL,
	"organization_name" text NOT NULL,
	"owner_email" text NOT NULL,
	"intended_role" text DEFAULT 'owner' NOT NULL,
	"operator" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"organization_transport_state" text DEFAULT 'queued' NOT NULL,
	"organization_lease_until" timestamp with time zone,
	"organization_lease_generation" integer DEFAULT 0 NOT NULL,
	"organization_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_subject" text,
	"consumed_user_id" uuid,
	CONSTRAINT "customer_provisionings_organization_instance_unique" UNIQUE("organization_id","instance_id"),
	CONSTRAINT "customer_provisionings_instance_nonempty" CHECK (length(btrim("customer_provisionings"."instance_id")) > 0),
	CONSTRAINT "customer_provisionings_name_valid" CHECK (length(btrim("customer_provisionings"."organization_name")) between 1 and 200),
	CONSTRAINT "customer_provisionings_email_normalized" CHECK ("customer_provisionings"."owner_email" = lower(btrim("customer_provisionings"."owner_email")) and length("customer_provisionings"."owner_email") between 1 and 254),
	CONSTRAINT "customer_provisionings_role_owner" CHECK ("customer_provisionings"."intended_role" = 'owner'),
	CONSTRAINT "customer_provisionings_status_check" CHECK ("customer_provisionings"."status" in ('pending', 'consumed', 'cancelled')),
	CONSTRAINT "customer_provisionings_transport_state_check" CHECK ("customer_provisionings"."organization_transport_state" in ('queued', 'sending', 'ready', 'unknown', 'failed')),
	CONSTRAINT "customer_provisionings_lease_generation_nonnegative" CHECK ("customer_provisionings"."organization_lease_generation" >= 0),
	CONSTRAINT "customer_provisionings_consumed_fields_coherent" CHECK (("customer_provisionings"."status" = 'consumed' and "customer_provisionings"."consumed_at" is not null and "customer_provisionings"."consumed_subject" is not null and "customer_provisionings"."consumed_user_id" is not null) or ("customer_provisionings"."status" <> 'consumed' and "customer_provisionings"."consumed_at" is null and "customer_provisionings"."consumed_subject" is null and "customer_provisionings"."consumed_user_id" is null))
);
--> statement-breakpoint
ALTER TABLE "customer_owner_invitations" ADD CONSTRAINT "customer_owner_invitations_request_id_customer_provisionings_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."customer_provisionings"("request_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_owner_invitations" ADD CONSTRAINT "customer_owner_invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_provisionings" ADD CONSTRAINT "customer_provisionings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_provisionings" ADD CONSTRAINT "customer_provisionings_consumed_user_id_users_id_fk" FOREIGN KEY ("consumed_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_owner_invitations_one_pending_per_request" ON "customer_owner_invitations" USING btree ("request_id") WHERE "customer_owner_invitations"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "customer_owner_invitations_instance_provider_id_unique" ON "customer_owner_invitations" USING btree ("instance_id","provider_invitation_id") WHERE "customer_owner_invitations"."provider_invitation_id" is not null;--> statement-breakpoint
CREATE INDEX "customer_owner_invitations_request_created_idx" ON "customer_owner_invitations" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_provisionings_status_created_idx" ON "customer_provisionings" USING btree ("status","created_at");