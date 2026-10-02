# Console authentication and organization access

## Identity and authorization

Clerk verifies the Console session and keeps registration invitation-only. Development app `app_3K9Cnx185cBaBgyMM441dY68SQ9` is configured with restricted sign-up. An accepted invitation creates a Clerk account only; it does not grant a Weft user mapping or organization role.

The Console resolves the verified Clerk subject through `user_auth_identities`, scoped by `WEFT_CLERK_INSTANCE_ID`, and returns the existing local `users.id` UUID. Event ownership, creator IDs and import provenance continue to use that UUID. Email matching is never used to link identities. Disabled or missing mappings fail closed; no user is created during a login or read.

Neon `organization_memberships` is the authority for organization access and roles. Each protected request reads active membership again. Only owners and organizers enter the organizer Console. Staff and sponsors receive the neutral access page until their operational workflows are implemented. A browser cookie can remember a selected organization, but is bound to the local user and never grants access by itself.

Overview, Events listing, Network and People remain illustrative fixture pages. Their visible demo notices do not represent selected-organization records. Create Event, Event Detail, covers and attendee CSV import continue using persisted Neon records and their event-level permission checks. Sponsor reports remain unavailable until participation and report authorization are modeled.

## Invitation and provisioning lifecycle

1. An administrator sends an invitation from Clerk Dashboard. Invitation delivery is a separate administrative task.
2. The recipient accepts the invitation and signs in. A valid but unmapped account sees the Console access page.
3. An administrator retrieves the exact Clerk user subject and the instance configured for that deployment, then explicitly links it to a local UUID or provisions a new local user:

   ```bash
   WEFT_PROVISION_TARGET=development pnpm exec node --env-file=.env.local --experimental-strip-types scripts/provision-clerk-user.ts \
     --instance-id ins_development \
     --clerk-user-id user_example12345678 \
     --display-name "Organizer Name"
   ```

   To link an existing local user instead, use `--local-user-id <UUID>` in place of `--display-name`. `--avatar-url https://...` is optional. The command requires explicit `WEFT_PROVISION_TARGET=development|test`, reads the direct development/test connection from `DATABASE_MIGRATION_URL`, and refuses database targets other than Neon `weft_console_test`. It prints only the local UUID and operation result. Exact repeated mappings are safe; conflicting or disabled mappings require administrative review.
4. Provision an existing organization membership separately using the existing membership administration workflow. Invitation acceptance and identity linking never assign a role.

Mapping revocation sets `disabled_at` on the matching provider, instance and subject row. Membership revocation sets `organization_memberships.active = false`. Both changes affect the next protected request. Do not delete or reassign identity rows to repair a conflict; resolve ownership explicitly.

## Environment and migration

Set the server-only `WEFT_CLERK_INSTANCE_ID` to the Clerk instance identifier paired with that deployment's Clerk keys. Development and production instances must use distinct values. Clerk SDK keys verify sessions; this setting only scopes the local identity mapping. Never expose it through a `NEXT_PUBLIC_` variable.

Runtime uses the pooled Neon connection in `DATABASE_URL`. Migration and explicit provisioning use the direct development/test connection in `DATABASE_MIGRATION_URL` with `WEFT_MIGRATION_TARGET=development` or `test`. Automated database cases use `DATABASE_TEST_URL` and are enabled only against the disposable `dev` / `weft_console_test` target. Production is `production` / `weft_console` and is outside local feature work.

The forward migration is `drizzle/0002_clerk_user_identities.sql`; migrations `0000` and `0001` are preserved. It was applied to the verified development `weft_console_test` database, and a second migration invocation completed with no migration pending. Never apply it to production as part of this plan.

## Verification record

`pnpm lint`, `pnpm typecheck` and `pnpm test` passed (84 tests passed; 7 isolated database tests skipped). `pnpm exec next build --webpack` passed. The default `pnpm build` Turbopack build could not run in this environment because its CSS worker failed while creating a process/binding to a port (`Operation not permitted`). A signed-out browser check on `localhost` confirmed `/`, `/events`, `/events/new`, a nested event URL with a tab query, `/network`, `/people` and `/partner-report` all redirect to Clerk sign-in; the Clerk form rendered and preserved each return destination. The database constraint suite is gated by `WEFT_DATABASE_TEST=1`; it was not run because the shared development database may be in active app or preview use. Signed-in owner/organizer flows require an explicitly invited and provisioned account; no invitations were sent and no production data or deployment was touched.

Authentication protects these pages; it does not convert fixture dashboards into live analytics or implement staff and sponsor reporting workflows.
