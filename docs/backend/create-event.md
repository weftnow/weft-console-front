# Create Event backend

The server authentication adapter is intentionally unconfigured. `getCurrentUser()` returns `null`, so protected API requests return 401 and Create Event and Event Detail show an authentication-required state. A future adapter must verify a real server-side session, map its provider subject to an existing local `users.id` UUID, and return that user's display name and avatar. It must never trust an identity from a request body, header or query parameter. Automated tests inject trusted actors at service and route boundaries only.

Pilot creation is for active organization owners and organizers. Staff and sponsors cannot create events or load the organizer Detail DTO. For one permitted organization, the server selects it; when a user belongs to several, the form requires a selected organization UUID and the server rechecks membership. Selected staff must have active staff or organizer membership in that same organization. Event submission never provisions membership.

Initial guest uploads are limited to 2,000 combined guests. CSV text is limited to 1 MiB UTF-8, the complete JSON request to 3 MiB, and a normalized cover to 256 KiB. Invalid rows, duplicate emails and invalid images reject the entire creation. Save as Draft is session-only; it does not persist. Server idempotency is future work, so a lost POST response can require manual reconciliation.

The Console uses its own `weft_console` database on the `dev` branch of the Neon "Weft B2B" project, with `weft_console_test` for the database test suite. The `weft` database on that branch belongs to a separate Alembic-managed service and already defines its own `events` and `organizers` tables, which conflict with this migration's `events` table and duplicate its identity model. The Console therefore does not share that database; integrating with its organizers and events is deliberate future work. Never run schema push or apply this migration to the `production` branch during development.

Real pilot user provisioning, provider identity mapping, and authenticated browser verification remain gated on the separate authentication integration.

## Local setup and migration

Install with `pnpm install`. Use `.env.example` as the variable template; keep actual URLs in an untracked local environment file or the deployment secret store. `DATABASE_URL` is the runtime connection and `DATABASE_MIGRATION_URL` is the migration administrator connection. Neither belongs in a `NEXT_PUBLIC_` variable. The runtime connection is opened lazily, so `pnpm build` needs no database.

The generated migration is `drizzle/0000_create_event_backend.sql` with its Drizzle journal and snapshot in `drizzle/meta/`. It has been applied to `weft_console` and `weft_console_test` on the `dev` branch; a second run made no changes. Before applying it to any other database, inspect tables, constraints, identity identifiers and `drizzle.__drizzle_migrations` read-only. If authoritative `users` or organization tables already exist, adapt and baseline the migration rather than recreating them.

Use Neon's pooled connection string for `DATABASE_URL` and the direct one for `DATABASE_MIGRATION_URL`. The Vercel project stores the pooled `weft_console` URL as a sensitive `DATABASE_URL` for Production and Preview.

After review, set `DATABASE_MIGRATION_URL` to an isolated development or test branch and run:

```bash
WEFT_MIGRATION_TARGET=development pnpm db:migrate
```

Run it a second time to verify migration tracking prevents reapplication. The explicitly enabled database suite requires a separately configured isolated `DATABASE_TEST_URL` with the migration already applied:

```bash
WEFT_DATABASE_TEST=1 DATABASE_TEST_URL=postgresql://... pnpm test
```

The default suite does not connect to a database. The live database suite passes against `weft_console_test`.

## Pilot provisioning and release

After the future authentication adapter has mapped a verified provider subject to an existing local user UUID, provision a membership intentionally on a development or test database:

```bash
WEFT_PROVISION_TARGET=development DATABASE_URL=postgresql://... node --experimental-strip-types scripts/seed-pilot.ts USER_UUID ORGANIZATION_UUID organizer
```

The command requires existing user and organization records, validates UUIDs and role, and can safely repeat the same membership. It does not create an authenticated session or account. The supported roles are `owner`, `organizer`, `staff` and `sponsor`.

For a pilot release, inspect the target schema and migration journal, adapt/baseline any authoritative identity tables, review the generated SQL, apply the tracked migration once in an authorized release operation, provision real verified users and organization memberships, then connect the authentication adapter. Test the authenticated browser lifecycle by creating an event, refreshing Detail and opening its UUID URL in another authorized browser with empty localStorage. Confirm cross-organization, staff and sponsor denial, and the protected cover response. The checked-in local migration command intentionally permits only development/test targets; an authorized pilot release must use a separately controlled migration operation.
