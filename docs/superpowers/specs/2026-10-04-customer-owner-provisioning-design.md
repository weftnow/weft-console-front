# Customer and initial Owner provisioning design

Status: proposed design for the requested implementation plan. Repository planning only; no provider settings, email, database or deployment changes.

## Agreed outcome

An internal operator runs one CLI command with a customer organization name and initial Owner's email. Weft creates the organization and pending Owner grant in PostgreSQL first, creates the corresponding Clerk organization and invitation, and records their provider IDs. The recipient accepts and authenticates with Clerk. Weft creates or reuses the exact local identity, grants Owner and consumes the pending grant atomically. The recipient enters the organization's Console without an administrator running anything after acceptance.

This replaces the earlier discussion of creating organizations manually in Clerk Dashboard. The user explicitly chose a **CLI command** and **Weft-first provisioning records**, rejecting Clerk metadata as the location of Owner designation.

Clerk provides identity, authentication and invitation transport. Clerk Admin/Member roles never determine Weft Owner/Organizer/Staff/Sponsor roles. PostgreSQL owns business authorization. After initial provisioning, all teammate invitations, role assignments, removals and team management belong inside Weft. Direct Clerk Dashboard invitations and membership edits are not alternative ways to grant or change Weft access.

## Current foundation

Owner-managed team invitations have since been implemented in the repository, with live integration verification still pending. Reuse their provider adapter, acceptance page, recovery UI, identity serialization convention, organization mapping and cookie behavior. The existing `organization_invitations.inviter_user_id` is non-null and its admission transaction requires an active owner. Initial customer creation cannot satisfy that requirement; do not fake an inviter, bootstrap an internal staff member as a customer owner, or make the existing authorization optional.

Existing provider organization mappings are in `organization_auth_identities`. Initial Owner records will live separately from teammate invitations. Reuse transport and focused identity logic where practical, without weakening the team invitation service.

## CLI contract

Entry point: `scripts/provision-customer.ts`. Commands:

- `create --request-id <UUID> --organization-name <name> --owner-email <email>`: previews by default; `--apply --send-invitation` performs the complete local-first provisioning and email delivery.
- `status --request-id <UUID>`: read-only, sanitized local state and IDs.
- `retry --request-id <UUID> --apply --send-invitation`: resumes failed or unknown external provisioning with reconciliation before any resend.
- `renew --request-id <UUID> --apply --send-invitation`: replaces an expired initial invitation for the same designated email, before bootstrap consumption; never creates a second customer or Owner grant.
- `cancel --request-id <UUID> --apply`: cancels pending bootstrap locally first and attempts provider invitation cleanup. Cannot remove an accepted Owner or delete customer data.

Require `WEFT_PROVISION_TARGET=development|test`, `DATABASE_MIGRATION_URL`, `CLERK_SECRET_KEY`, `WEFT_CLERK_INSTANCE_ID`, `WEFT_APP_ORIGIN` and `WEFT_PROVISION_OPERATOR` for mutations. Initial implementation retains the existing scripts' restriction to Neon `weft_console_test`; production enablement uses a separately reviewed release workflow. `WEFT_PROVISION_OPERATOR` is an audit label, not proof of permission. Database/API credentials and control of the internal CLI are the actual administrative trust boundary. There is no public bootstrap endpoint.

Validate organization name trimmed to 1–200 characters, email with Zod and maximum 254 characters, exact UUID request ID and canonical same-origin application URL. Normalize emails by trim/lowercase only. Instance must equal configured `WEFT_CLERK_INSTANCE_ID`; do not accept a second arbitrary instance argument. Request IDs are operator-supplied durable idempotency keys. Repeating the same ID with different immutable inputs is a conflict. Organization names are not unique identifiers; two intentionally distinct customers may share a name. Operators reuse the request ID when resuming rather than issue a new one.

Dry-run performs no writes and sends no email. Ordinary create/retry flows must not silently renew an expired invitation. Explicit `renew` preserves the customer and designated email, creates a fresh invitation UUID and invalidates the old one. Changing the intended initial Owner is outside this version and must not happen through edited CLI inputs or Clerk metadata.

## Local records and state

Add `customer_provisionings`: request UUID primary key; organization UUID FK; instance ID; immutable organization name and normalized initial Owner email; literal intended role constrained to `owner`; operator label; status `pending|consumed|cancelled`; organization transport state `queued|sending|ready|unknown|failed`; operation lease expiry and monotonically increasing lease generation; sanitized transport error code; created/consumed timestamps; consumed Clerk subject/local-user FK. Unique `(organization_id, instance_id)`; accepted/consumed fields coherent with status.

Add `customer_owner_invitations`: invitation UUID primary key; provisioning FK; instance ID; provider invitation ID nullable; status `pending|accepted|revoked|expired`; delivery state `queued|sending|sent|unknown|failed`; lease expiry/generation; created/expiry/accepted timestamps; cleanup-pending flag; sanitized error code. Unique pending invitation per provisioning; unique non-null `(instance_id, provider_invitation_id)` within this table. Intended email and role come only from the parent local provisioning record. A consumed/cancelled parent cannot get a new pending invitation through repository operations.

Create the organization, provisioning parent and first pending Owner invitation in one local transaction before any external call. Use a seven-day invitation window consistent with the existing team flow. Renewal appends history; parent consumption prevents any historical invite from granting another initial Owner. No user or membership is created at CLI send time.

## External provisioning and interruption

Create a Clerk organization without `createdBy`, so an operator does not become a customer member. Store only `publicMetadata.weftOrganizationId` as a correlation locator; this contains no Owner email or role and is never sufficient to authorize access. Resolve the existing mapped provider organization by exact local UUID, not by display name. A mapping conflict or multiple provider matches requires review.

Use the existing transport invitation payload: `org:member`, seven days, `publicMetadata.weftInvitationId` containing the local bootstrap invitation UUID and a redirect to `/accept-invitation?invitation=<UUID>`. Role is always transport-only. Record organization identity and provider invitation ID in local records. Do not write Owner designation or intended business roles to Clerk private/public metadata.

Each external operation uses a durable 60-second lease with generation fencing. Provider calls are outside local database transactions. A late worker cannot overwrite newer local state after losing its lease. Do not blind-retry an operation whose outcome is unknown: paginate provider objects and reconcile the exact correlation first. A known no-attempt state may call create; a definite provider rejection can retry after its cause is fixed. A timeout with no established provider result remains unknown and offers an explicit retry later. Provider writes already in flight cannot be transactionally cancelled; duplicate exact matches fail closed rather than choosing one. Canonical organization/request correlations and retained local history make recovery reviewable.

Cancellation/renewal closes the old local invitation under locks before provider cleanup. If cleanup fails, retain the warning and deny admission through the old record. Do not delete the local organization or revoke an already-consumed Owner as compensation. On renewal, an unresolved provider invitation conflict blocks sending the replacement until resolved; never claim a new email was sent on failure.

## Admission and normal team behavior

The public acceptance route remains a thin authentication entry point. After an active Clerk session, its Server Action dispatches by local invitation UUID to either the existing teammate invitation flow or the new bootstrap flow. Resolve IDs from local tables; do not accept a caller-supplied invitation type/role/actor as authority. If an ID exists in both ledgers, deny as ambiguous. Disabled/pending/signed-out sessions do not provision.

Bootstrap evidence must verify configured instance, mapped Clerk organization, exact accepted provider invitation and correlation, provider membership belonging to the session subject and carrying the same invitation UUID, and designated email among that subject's verified Clerk emails. Provider acceptance must occur within the invitation's local window. An invite accepted on time can finish setup later. Neither a bare application invite nor arbitrary provider membership admits anyone. Email comparison verifies the invite recipient; it never identifies an existing local user by email.

Admission transaction locks the subject using the same advisory key as teammate admissions, then locks the provisioning parent and its invitation in a consistent order. Recheck parent pending/not cancelled, invitation consumable, org mapping, timestamps and consumption. Only a new customer with no local memberships may receive the initial Owner grant. If any member already exists, treat it as a conflict rather than promote or overwrite it. Reuse an enabled exact Clerk identity mapping, or create a UUID user and mapping. Disabled mappings and historical inactive memberships are conflicts. Preserve existing profile and other organizations. Insert active Owner membership and consume parent/invitation with exact subject/user together. Failure rolls back every write.

Repeated completion by the consumed subject is idempotent only while the exact mapping and resulting membership remain active. Never promote a demoted Owner or restore a removed member on replay. Changing or deleting the Clerk role/membership after consumption does not update Weft business permissions; do not add role mirroring webhooks. Access still requires a valid Clerk session and current Neon permissions.

After commit, reuse the existing user-bound organization cookie and redirect to `/`. Cookie writes and provisioning happen in mutations, not GET/render. Protected reads remain read-only. The existing owner-gated Team page and inviter checks retain their semantics.

## Recovery

Extend `/onboarding` and `/access-required` discovery to include bootstrap records proven for the active subject. Discovery writes nothing. Include pending grants accepted on time even when the local expiry has passed; the mutation verifies the acceptance timestamp. One proven invite completes automatically through the existing completion form; multiple organizations require a choice. Wrong account, cancelled/expired links and temporary outages use the existing safe states and retry controls. Tickets stay out of logs and are removed from browser URLs after authentication.

An already-created Clerk account, including the user's blocked test account, receives the bootstrap invitation and signs in normally. No account recreation or post-acceptance script is required. Without an explicit local bootstrap or teammate invitation, access remains denied.

## Scope and verification

This plan implements the initial customer/Owner CLI and connects it to acceptance/recovery. The existing teammate invitation feature remains in Weft. Full member removal, role editing and staff/sponsor destinations are not currently present and are separate feature work; this plan does not claim they are implemented. Their future source of authority must be PostgreSQL and their UI must be Weft, never Clerk Dashboard.

No webhook is required: organizations are created locally by the CLI before provider calls, and admission checks the Backend API synchronously. No provider settings, real email, production changes or live migrations are authorized by writing this plan.

Verify dry-run safety, local-first ordering, idempotency/conflicting inputs, partial provider failures, late-worker fencing, duplicate correlation conflicts, pagination, first-owner conflicts, acceptance/renew/cancel races, exactly-once consumption, disabled mappings, demotion/removal replay, ordinary teammate regression, existing/new accounts and interrupted browser setup. Run required lint/typecheck/test/build and isolated DB cases; record browser/provider verification separately.

References: `ARCHITECTURE.md`, `docs/backend/invitation-onboarding.md`, `src/modules/organizations/invitations/`, `src/infrastructure/database/schema/organization-invitations.ts`, `scripts/setup-clerk-organizations.ts`, and the earlier invitation design. This design supersedes that design's manual first-owner provisioning requirement once implemented. Local Next.js authentication/mutation/cookie guides govern route changes. [Clerk invitation transport](https://clerk.com/docs/guides/organizations/add-members/invitations) and [creation parameters](https://clerk.com/docs/reference/backend/organization/create-organization-invitation) support the transport; the local bootstrap authority and lifecycle are Weft decisions.
