# Vercel deployments and database migrations

Vercel uses the checked-in `vercel.json` build command, `pnpm build:vercel`.
It validates the database settings, runs `pnpm build`, then runs `pnpm db:migrate`.
Either command failing fails the deployment. A failed app build never applies migrations.
Local `pnpm build` continues to build only the app.

## One-time Vercel setup

In the project's **Settings → Environment Variables**, configure separate values
for Production and Preview. Copy connection strings from the intended Neon branch;
use the pooled connection for runtime and the direct connection for migrations.
Keep `sslmode=require` on both URLs.

| Variable | Production | Preview |
| --- | --- | --- |
| `DATABASE_URL` | Pooled `production` branch / `weft_console` | Pooled `dev` branch / `weft_console_test` |
| `DATABASE_MIGRATION_URL` | Direct `production` branch / `weft_console` | Direct `dev` branch / `weft_console_test` |
| `WEFT_MIGRATION_TARGET` | `production` | `development` |

The migration credentials must allow schema changes. All three variables are
server-only; never prefix them with `NEXT_PUBLIC_`. Vercel supplies `VERCEL=1` and
`VERCEL_ENV`; keep automatic system environment variables enabled. The runner
rejects unsupported environments, pooled migration URLs, wrong database names,
and runtime/migration URLs pointing to different Neon endpoints. Database names
alone do not identify a Neon branch: confirm each endpoint in Neon when setting
the variables. URL query parameters are limited to `sslmode`, `channel_binding`,
and `application_name` so driver options cannot override the validated connection.

Merge this branch into the production branch and deploy after setting these
variables. The checked-in build command takes precedence over the dashboard
Build Command. The build logs report migration completion or fail the deployment.
Preview deployments now also require their own migration configuration; do not
give Preview the production connection. Preview shares the disposable local/test
database, so avoid live database tests while previews or local development use it.

## First production rollout

Before the first deployment using this command, inspect the existing schema and
`drizzle.__drizzle_migrations` in `production` / `weft_console`, confirm that the
history matches the committed migrations, review pending SQL, and confirm a
database recovery point. Existing tables without matching migration history need
explicit reconciliation before release; the runner does not guess or baseline them.

The runner uses Drizzle's existing journal in `drizzle.__drizzle_migrations`,
applying only pending SQL from `drizzle/`. It does not generate migrations or push
the schema. A session advisory lock serializes migration runs before reading the
journal. A second deployment waits up to 60 seconds for database locks, then fails
if it cannot acquire one; retry after the other migration completes. Drizzle applies
pending migrations and journal entries transactionally. The connection closes on
success or failure, releasing its session lock.

Successful migrations change the database before Vercel publishes the app. The
previous app can still serve traffic then, and a later deployment/promotion failure
does not undo the schema change. Review migrations for compatibility with both app
versions. Rolling back a Vercel deployment does not roll back the database. Run a
fresh production build for releases; promoting a prebuilt artifact bypasses this
build step and needs a separate migration step.

Missing variables or database/SQL errors stop deployment. Driver errors are not
printed verbatim because they can contain credentials or data. Inspect database
history, connectivity and pending SQL using authorized operational access before
retrying. Do not reset the database or edit migration history to silence an error.

This change creates schema only. It does not bootstrap customers, grant roles, or
send invitations. The customer provisioning CLI remains restricted to development
and test; see [customer provisioning](customer-provisioning.md).
