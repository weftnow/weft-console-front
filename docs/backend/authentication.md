# Console authentication and organization access

## Identity and authorization

Clerk verifies the Console session and keeps registration invitation-only. Development app `app_3K9Cnx185cBaBgyMM441dY68SQ9` is configured with restricted sign-up. An accepted invitation creates a Clerk account only; it does not grant a Weft user mapping or organization role.

The Console resolves the verified Clerk subject through `user_auth_identities`, scoped by `WEFT_CLERK_INSTANCE_ID`, and returns the existing local `users.id` UUID. Event ownership, creator IDs and import provenance continue to use that UUID. Email matching is never used to link identities. Disabled or missing mappings fail closed; no user is created during a login or read.

Neon `organization_memberships` is the authority for organization access and roles. Each protected request reads active membership again. Only owners and organizers enter the organizer Console. Staff and sponsors receive the neutral access page until their operational workflows are implemented. A browser cookie can remember a selected organization, but is bound to the local user and never grants access by itself.

Overview and the Events listing render the selected organization's persisted events (owner and organizer memberships only). Network and People render empty states until their data sources exist; no page shows fixture data. Create Event, Event Detail, covers and attendee CSV import continue using persisted Neon records and their event-level permission checks. The sponsor report requires a session and renders an empty state until participation and report authorization are modeled.

## Invitation and provisioning lifecycle

The Console now has an owner-managed Team invitation flow. The selected Neon organization determines the invitation destination, and the owner chooses `owner` or `organizer` before sending. Clerk sends and accepts the email invitation; the Weft invitation ledger and Neon membership transaction grant Console access. Clerk membership roles are transport details only.

An accepted invitation verifies the Clerk subject, exact provider organization and local invitation UUID correlation, current verified email addresses, provider membership timestamp, local instance mapping and active inviter. The transaction reuses an enabled identity mapping or creates one, preserves an existing local UUID and profile, and adds the invited membership only when no membership exists. Existing active memberships keep their current role. Email is never used to link a local user.

Owners can retry failed delivery and reconcile an unknown outcome. If Clerk accepted a send but its response was lost, the Console searches the provider invitation pages for the local UUID before retrying. If delivery cannot be established, the invitation remains unknown and the UI does not claim that it was sent. Revocation updates Neon first; a failed Clerk cleanup remains visible, while local admission stays revoked.

An existing signed-in user can recover a newly accepted organization through `/onboarding`. `/access-required` remains a denied-access state without exact accepted-invitation evidence. A local membership revocation or disabled identity mapping continues to block replay.

First-owner setup remains an explicit administrative operation. Do not promote the first signed-in person. The organization bridge setup command maps exact existing local organization UUIDs to Clerk Organizations; it does not create owners or memberships. The historical user provisioning command remains available for exceptional operations and initial bootstrap, not routine invitation recipients.

## Invitation rollout prerequisites

Before enabling this flow in an environment, enable Clerk Organizations with Membership optional, keep the instance's restricted registration and email sign-up settings, and disable end-user organization creation and automatic domain enrollment. Configure server-only `WEFT_APP_ORIGIN` to the canonical Console origin. Apply the invitation migration through the authorized migration process, then run the organization setup command in dry-run mode and review every exact organization UUID before an explicitly authorized apply. See [invitation onboarding operations](invitation-onboarding.md).

The implementation has not changed live Clerk settings, applied the invitation migration, created provider organizations, bootstrapped owners or sent invitation email. Restricted-signup ticket acceptance and signed-in invitation scenarios still require live development verification before release.

Mapping revocation sets `disabled_at` on the matching provider, instance and subject row. Membership revocation sets `organization_memberships.active = false`. Both changes affect the next protected request. Do not delete or reassign identity rows to repair a conflict; resolve ownership explicitly.

## Environment and migration

Set the server-only `WEFT_CLERK_INSTANCE_ID` to the Clerk instance identifier paired with that deployment's Clerk keys. Development and production instances must use distinct values. Clerk SDK keys verify sessions; this setting only scopes the local identity mapping. Never expose it through a `NEXT_PUBLIC_` variable.

Runtime uses the pooled Neon connection in `DATABASE_URL`. Migration and explicit provisioning use the direct development/test connection in `DATABASE_MIGRATION_URL` with `WEFT_MIGRATION_TARGET=development` or `test`. Automated database cases use `DATABASE_TEST_URL` and are enabled only against the disposable `dev` / `weft_console_test` target. Production is `production` / `weft_console` and is outside local feature work.

The forward migration is `drizzle/0002_clerk_user_identities.sql`; migrations `0000` and `0001` are preserved. It was applied to the verified development `weft_console_test` database, and a second migration invocation completed with no migration pending. Never apply it to production as part of this plan.

## Verification record

`pnpm lint`, `pnpm typecheck` and `pnpm test` passed (84 tests passed; 7 isolated database tests skipped). `pnpm exec next build --webpack` passed. The default `pnpm build` Turbopack build could not run in this environment because its CSS worker failed while creating a process/binding to a port (`Operation not permitted`). A signed-out browser check on `localhost` confirmed `/`, `/events`, `/events/new`, a nested event URL with a tab query, `/network`, `/people` and `/partner-report` all redirect to Clerk sign-in; the Clerk form rendered and preserved each return destination. The database constraint suite is gated by `WEFT_DATABASE_TEST=1`; it was not run because the shared development database may be in active app or preview use. Signed-in owner/organizer flows require an explicitly invited and provisioned account; no invitations were sent and no production data or deployment was touched.

Authentication protects these pages; it does not implement live networking analytics or staff and sponsor reporting workflows.
