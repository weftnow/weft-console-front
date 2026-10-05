# Customer and initial Owner provisioning

The internal CLI creates a customer organization and a pending initial Owner grant in PostgreSQL before it calls Clerk. Clerk creates the organization and sends the invitation. After the recipient accepts and authenticates, the Console verifies the exact local grant and provider evidence, then creates or reuses that Clerk subject's local identity and grants Owner in one transaction. Operators do not run a command after acceptance.

PostgreSQL is authoritative for Weft roles and organization access. Clerk supplies identity, authentication, organization transport and invitation email. Clerk roles never set Weft roles. Provider metadata contains only `weftOrganizationId` and `weftInvitationId` correlation UUIDs; it never contains the designated Owner email, an Owner flag or a Weft role. Do not use Clerk Dashboard membership edits as a way to invite teammates or change Weft access.

## Prerequisites

The CLI supports `development`, `test` and `production` targets. Mutations require:

- `WEFT_PROVISION_TARGET=development`, `test` or `production`.
- A direct Neon `DATABASE_MIGRATION_URL` using PostgreSQL, explicit TLS (`sslmode=require`, `verify-ca` or `verify-full`), and the target database: `weft_console_test` for development/test or `weft_console` for production. Production must use a direct host, not a `-pooler.` host.
- `CLERK_SECRET_KEY` and the matching `WEFT_CLERK_INSTANCE_ID`. Production requires an `sk_live_` key; development/test reject live keys.
- `WEFT_APP_ORIGIN` as the canonical Console origin. Production requires HTTPS and rejects localhost and loopback origins.
- `WEFT_PROVISION_OPERATOR` as an audit label. It identifies the operator in the local record; credentials and control of the internal CLI are the administrative trust boundary.

The database name, key prefix and instance ID do not prove that the selected Neon branch or Clerk key belongs to the intended production application. Use the direct production endpoint, instance identifier and origin configured for the deployed app. This validator does not contact providers to verify that relationship.

Provisioning scripts do not automatically load Next.js environment files, and Vercel's deployed environment variables are not available in a local terminal. Supply production settings through exported environment variables or an explicitly selected, gitignored `.env.production.local` file. Keep `.env.local` and `.env.example` on development. A production secrets file should contain:

```dotenv
WEFT_PROVISION_TARGET=production
DATABASE_MIGRATION_URL=<direct-production-Neon-URL-for-weft_console-with-sslmode>
CLERK_SECRET_KEY=<production-sk_live_key>
WEFT_CLERK_INSTANCE_ID=<deployed-production-instance-id>
WEFT_APP_ORIGIN=https://<canonical-production-console-host>
WEFT_PROVISION_OPERATOR=<operator-audit-label>
```

Production prerequisites status: the operator confirmed for this work that production migrations and Clerk settings are deployed. This repository change did not independently inspect production, alter provider settings, apply migrations, send invitations or verify delivery. Historical implementation checks and any production acceptance verification must be recorded separately.

The Clerk instance must have Organizations enabled, membership optional, restricted sign-up and email sign-up enabled, end-user organization creation disabled, and automatic domain enrollment disabled. Confirm the endpoint, app origin and instance against the intended environment before an authorized delivery.

## Commands

Every command requires a durable operator-generated UUID. Reuse the same UUID to inspect or resume the same customer. A different name or Owner email with the same UUID is rejected. Organization names are not unique identifiers, so separate request UUIDs may create customers with the same name.

Create a request UUID once and retain it for retries and recovery:

```bash
PROVISION_REQUEST_ID="$(uuidgen)"
```

The create preview is input-only. It validates request fields, but does not validate deployed configuration, connectivity or invitation delivery. It writes no rows and calls no provider:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer create \
  --request-id "$PROVISION_REQUEST_ID" \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com"
```

Create the local organization, pending Owner grant and invitation history first, then provision the Clerk organization and automatically send the Owner invitation:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer create \
  --request-id "$PROVISION_REQUEST_ID" \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com" \
  --apply --send-invitation
```

Inspect sanitized local state and recorded IDs:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer status \
  --request-id "$PROVISION_REQUEST_ID"
```

Resume a failed or unknown organization/invitation operation. The command reconciles exact provider UUID correlations before any new send:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer retry \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply --send-invitation
```

Replace an expired invitation for the same designated email. Renewal keeps the customer and Owner grant, closes the old local invitation first, and blocks the replacement send until any old provider invitation can be reconciled and cleaned up:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer renew \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply --send-invitation
```

Cancel a pending customer bootstrap locally before attempting provider cleanup. Cancellation cannot remove an Owner grant that has already been consumed or delete customer data:

```bash
NODE_OPTIONS="--env-file=.env.production.local" \
pnpm run --silent provision:customer cancel \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply
```

Exported variables take precedence over values in the Node environment file. Use a terminal without conflicting development variables. If all production variables are already exported, omit the `NODE_OPTIONS` assignment. Do not generate a new request UUID when retrying, renewing, cancelling or checking status.

## Results and recovery

The CLI prints JSON with local and provider IDs, a status, a sanitized error code and whether provider cleanup remains pending. `dry-run` has no local or provider IDs. `pending` means an operation is still leased or awaits work. `sent` means Clerk acknowledged an invitation or exact reconciliation found one; it does not prove delivery to the recipient's inbox. `unknown` means a provider result could not be established; check `status` and use reconciliation with the same request ID rather than starting another request. `failed` is a known rejection or a conflict requiring operator review. `consumed` means Weft committed the initial Owner grant. `cancelled` means the local grant is closed. A cleanup warning means local admission remains denied while provider cleanup still needs review.

The recipient signs into the Clerk account that owns the designated verified email. `/accept-invitation` or the existing `/onboarding` recovery path completes the transaction automatically. Acceptance requires no follow-up provisioning command. An existing Clerk account keeps its current local UUID, profile and memberships in other organizations. A local membership already present in the new customer, a disabled identity, a cancelled grant, a late acceptance or an ambiguous provider correlation fails closed. Replaying a consumed invitation cannot restore a demoted or removed Owner.

Do not edit the Owner email or role in Clerk metadata. The initial role is fixed to local `owner` intent. Email normalization trims whitespace and lowercases the address; plus aliases and dots are otherwise preserved.

After initial access, existing Weft Team invitations remain owner-gated and use the existing non-null inviter check. The current team UI supports invitations for Owner and Organizer roles; member removal and role editing are separate future work. No public bootstrap endpoint, Clerk-role synchronization webhook or per-recipient script is part of this flow.

## Verification and rollout boundary

Unit tests use synthetic configuration and mocked provider clients. They cover dry-run safety, CLI guards and direct Node invocation, local-first call order, provider pagination/correlation, idempotent request handling, unknown outcomes, cleanup and renewal behavior, exact acceptance evidence, dispatcher ambiguity and retryable discovery outages. The gated PostgreSQL test source covers concurrent reservation/admission, existing-account preservation, and demotion/removal replay, but it is skipped when no isolated `DATABASE_TEST_URL` is configured; database locking, rollback and migration behavior have not been verified against a real isolated database.

This implementation session did not use production credentials or verify production delivery, provision a customer, send an invitation, change provider settings, apply migrations, deploy code or perform signed-in browser acceptance. The full onboarding flow is not verified end to end against production. For an authorized customer acceptance check, retain the request UUID; create and confirm `sent`; have the recipient accept at the production origin; confirm Owner dashboard and Team access; then read status and confirm `consumed`. Check that organizer/staff/sponsor accounts still lack invitation management access. Use development or an isolated test environment for cancellation, renewal, demotion and replay experiments.
