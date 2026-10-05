# Customer and initial Owner provisioning

The internal CLI creates a customer organization and a pending initial Owner grant in PostgreSQL before it calls Clerk. Clerk creates the organization and sends the invitation. After the recipient accepts and authenticates, the Console verifies the exact local grant and provider evidence, then creates or reuses that Clerk subject's local identity and grants Owner in one transaction. Operators do not run a command after acceptance.

PostgreSQL is authoritative for Weft roles and organization access. Clerk supplies identity, authentication, organization transport and invitation email. Clerk roles never set Weft roles. Provider metadata contains only `weftOrganizationId` and `weftInvitationId` correlation UUIDs; it never contains the designated Owner email, an Owner flag or a Weft role. Do not use Clerk Dashboard membership edits as a way to invite teammates or change Weft access.

## Prerequisites

Use the development/test environment only. The CLI mutation guard requires:

- `WEFT_PROVISION_TARGET=development` or `test`.
- `DATABASE_MIGRATION_URL` for TLS Neon `weft_console_test`.
- `CLERK_SECRET_KEY` and the matching `WEFT_CLERK_INSTANCE_ID`.
- `WEFT_APP_ORIGIN` as the canonical Console origin, for example `https://console.example.com`.
- `WEFT_PROVISION_OPERATOR` as an audit label. It identifies the operator in the local record; credentials and control of the internal CLI are the administrative trust boundary.

Apply the reviewed forward migration `drizzle/0004_gigantic_taskmaster.sql` through the approved migration process before using the CLI. This implementation has prepared the migration but has not applied it. Keep the target on the disposable `weft_console_test` database; production needs a separately reviewed release workflow.

The Clerk instance must have Organizations enabled, membership optional, restricted sign-up and email sign-up enabled, end-user organization creation disabled, and automatic domain enrollment disabled. Confirm the configured app origin and instance match the intended environment before any authorized test delivery.

## Commands

Every command requires a durable operator-generated UUID. Reuse the same UUID to inspect or resume the same customer. A different name or Owner email with the same UUID is rejected. Organization names are not unique identifiers, so separate request UUIDs may create customers with the same name.

Preview a request. This mode writes no rows and calls no provider:

```bash
pnpm run --silent provision:customer create \
  --request-id 33333333-3333-4333-8333-333333333333 \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com"
```

Create the local organization, pending Owner grant and invitation history first, then provision the Clerk organization and send the invitation:

```bash
pnpm run --silent provision:customer create \
  --request-id 33333333-3333-4333-8333-333333333333 \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com" \
  --apply --send-invitation
```

Inspect sanitized local state and recorded IDs:

```bash
pnpm run --silent provision:customer status --request-id 33333333-3333-4333-8333-333333333333
```

Resume a failed or unknown organization/invitation operation. The command reconciles exact provider UUID correlations before any new send:

```bash
pnpm run --silent provision:customer retry \
  --request-id 33333333-3333-4333-8333-333333333333 \
  --apply --send-invitation
```

Replace an expired invitation for the same designated email. Renewal keeps the customer and Owner grant, closes the old local invitation first, and blocks the replacement send until any old provider invitation can be reconciled and cleaned up:

```bash
pnpm run --silent provision:customer renew \
  --request-id 33333333-3333-4333-8333-333333333333 \
  --apply --send-invitation
```

Cancel a pending customer bootstrap locally before attempting provider cleanup. Cancellation cannot remove an Owner grant that has already been consumed or delete customer data:

```bash
pnpm run --silent provision:customer cancel \
  --request-id 33333333-3333-4333-8333-333333333333 \
  --apply
```

## Results and recovery

The CLI prints JSON with local and provider IDs, a status, a sanitized error code and whether provider cleanup remains pending. `dry-run` has no local IDs. `pending` means an operation is still leased or awaits work. `sent` means Clerk returned an invitation or exact reconciliation found one. `unknown` means a provider result could not be established; it does not claim the email was sent. `failed` is a known rejection or a conflict requiring operator review. `consumed` means Weft committed the initial Owner grant. `cancelled` means the local grant is closed. A cleanup warning means local admission remains denied while provider cleanup still needs review.

Do not edit the Owner email or role in Clerk metadata. The initial role is fixed to local `owner` intent. Email normalization trims whitespace and lowercases the address; plus aliases and dots are otherwise preserved.

The recipient signs into the Clerk account that owns the designated verified email. `/accept-invitation` or the existing `/onboarding` recovery path completes the transaction automatically. An existing Clerk account keeps its current local UUID, profile and memberships in other organizations. A local membership already present in the new customer, a disabled identity, a cancelled grant, a late acceptance or an ambiguous provider correlation fails closed. Replaying a consumed invitation cannot restore a demoted or removed Owner.

After initial access, existing Weft Team invitations remain owner-gated and use the existing non-null inviter check. The current team UI supports invitations for Owner and Organizer roles; member removal and role editing are separate future work. No public bootstrap endpoint, Clerk-role synchronization webhook or per-recipient script is part of this flow.

## Verification and rollout boundary

Unit tests use mocked provider clients. They cover dry-run safety, CLI guards and direct Node invocation, local-first call order, provider pagination/correlation, idempotent request handling, unknown outcomes, cleanup and renewal behavior, exact acceptance evidence, dispatcher ambiguity and retryable discovery outages. The gated PostgreSQL test source covers concurrent reservation/admission, existing-account preservation, and demotion/removal replay, but it was skipped because this workspace has no `DATABASE_TEST_URL`; database locking, rollback and migration behavior have not been verified against a real isolated database.

No Clerk settings were changed, the migration was not applied, no customer was provisioned, no invitation email was sent, and no deployment or signed-in browser acceptance was performed. The full onboarding flow is not yet end-to-end verified. Before rollout, apply the reviewed migration in the authorized target, test a new and an existing Clerk account in development, confirm Owner dashboard and Weft Team access, exercise cancellation/renewal and local demotion/removal replay, and record browser/provider results separately. Do not use production as a substitute for those checks.
