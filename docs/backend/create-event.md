# Create Event backend

The server authentication adapter verifies the active Clerk session and maps its verified subject and configured instance to a local `users.id` UUID. The API never trusts an identity from a request body, header or query parameter. See [Console authentication](authentication.md) for invitation acceptance, identity provisioning and role setup. Automated tests inject trusted actors at service and route boundaries only.

Pilot creation is for active organization owners and organizers. Staff and sponsors cannot create events or load the organizer Detail DTO. For one permitted organization, the server selects it; when a user belongs to several, the form requires a selected organization UUID and the server rechecks membership. Selected staff must have active staff or organizer membership in that same organization. Event submission never provisions membership.

Initial guest uploads are limited to 2,000 combined guests. CSV text is limited to 1 MiB UTF-8, the complete JSON request to 3 MiB, and a normalized cover to 256 KiB. Invalid rows, duplicate emails and invalid images reject the entire creation. CSV guest batches use the same fingerprint and provenance model as later attendee imports; see [Attendee CSV imports](attendee-imports.md). Save as Draft is session-only; it does not persist. Event-creation request idempotency is still future work, so a lost create-event response can require manual reconciliation.

The selected Neon "Weft B2B" layout uses two databases across two branches:

| Neon branch | Database | Purpose |
| --- | --- | --- |
| `production` | `weft_console` | Real pilot events and attendees |
| `dev` | `weft_console_test` | Shared local development and automated database tests |

No separate development `weft_console` database or test branch is required. Local application and test connections both target `dev` / `weft_console_test`. Treat that database as disposable: tests create and clean up fixtures, and development migrations affect it too. Stop using the local app while live tests run; retain no irreplaceable data there.

The `weft` database on that branch belongs to a separate Alembic-managed service and already defines its own `events` and `organizers` tables, which conflict with this migration's `events` table and duplicate its identity model. The Console therefore does not share that database; integrating with its organizers and events is deliberate future work. Never run schema push or apply this migration to the `production` branch during development.

Local UUID users are linked explicitly through the Clerk identity provisioning command described in [Console authentication](authentication.md). Authenticated browser acceptance still requires an explicitly invited and provisioned development account with an active owner or organizer membership.

## Local setup and migration

Install with `pnpm install`. Use `.env.example` as the variable template; keep actual URLs in an untracked local environment file or the deployment secret store. `DATABASE_URL` is the runtime connection and `DATABASE_MIGRATION_URL` is the migration administrator connection. Neither belongs in a `NEXT_PUBLIC_` variable. The runtime connection is opened lazily, so `pnpm build` needs no database.

The original migration is `drizzle/0000_create_event_backend.sql` with its Drizzle journal and snapshot in `drizzle/meta/`. The append-import schema is a new forward migration, `drizzle/0001_attendee_import_batches.sql`; the original migration is not rewritten. Before applying migrations to any database, inspect tables, constraints, identity identifiers and `drizzle.__drizzle_migrations` read-only. If authoritative `users` or organization tables already exist, adapt and baseline the migration rather than recreating them.

For local setup, use the pooled `dev` / `weft_console_test` connection for `DATABASE_URL`, and its direct connection for both `DATABASE_MIGRATION_URL` and `DATABASE_TEST_URL`. Keep `WEFT_MIGRATION_TARGET=development`.

Configure deployment Production with the pooled `production` / `weft_console` URL. Configure deployment Preview with the pooled `dev` / `weft_console_test` URL; preview data is also disposable and live tests must not overlap preview usage. These are intended environment assignments, not confirmation that deployment secrets have already been updated.

After review, set `DATABASE_MIGRATION_URL` to the direct `dev` / `weft_console_test` connection in `.env.local` and run:

```bash
node --env-file=.env.local scripts/migrate.mjs
```

Run it a second time to verify migration tracking prevents reapplication. The migration script requires `WEFT_MIGRATION_TARGET=development` from that file; it does not load `.env.local` itself. Next.js loads `.env.local` for the app, but standalone migration/test commands need explicit loading.

The explicitly enabled database suite uses `DATABASE_TEST_URL` pointing to the same `dev` / `weft_console_test` database with migrations already applied. To run the existing `pnpm test` command with the local variables exported, use this in a shell (load only your own trusted local file):

```bash
set -a
source .env.local
set +a
WEFT_DATABASE_TEST=1 pnpm test
```

The default suite does not connect to a database. The live database suite passes against `weft_console_test`.

## Pilot provisioning and release

After the future authentication adapter has mapped a verified provider subject to an existing local user UUID, provision a membership intentionally on a development or test database:

```bash
WEFT_PROVISION_TARGET=development DATABASE_URL=postgresql://... node --experimental-strip-types scripts/seed-pilot.ts USER_UUID ORGANIZATION_UUID organizer
```

The command requires existing user and organization records, validates UUIDs and role, and can safely repeat the same membership. It does not create an authenticated session or account. The supported roles are `owner`, `organizer`, `staff` and `sponsor`.

For development and test, inspect the schema and migration journal in `dev` / `weft_console_test`, adapt/baseline any authoritative identity tables, review the generated SQL and apply there. Do not reset the shared database for migration tests; any destructive bootstrap/upgrade verification needs a temporary scratch database or isolated schema instead. Do not mutate production as part of local feature work. Production migration and rollout require a separately authorized release process. Real verified users and organization memberships plus the authentication adapter are required before authenticated browser acceptance; never bypass the auth seam to test the UI.
