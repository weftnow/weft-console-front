# Weft Console

The organizer, Weft staff and sponsor console for business events. The attendee experience lives elsewhere.

Install and run locally:

```bash
pnpm install
pnpm dev
```

Run the project checks:

```bash
pnpm verify
pnpm build
```

The Events backend uses PostgreSQL with Drizzle migrations. It persists Create Event CSV guests and supports append-only CSV imports from an event's Attendees roster. The selected Neon layout is `production` → `weft_console` for real pilot data and `dev` → `weft_console_test` shared by local development and automated tests. Copy `.env.example` to `.env.local`; all local database URLs target `dev` / `weft_console_test`. Treat its data as disposable and stop using the local app while live database tests run. Generate migration SQL with `pnpm db:generate --name=attendee_import_batches`; review it before applying with `node --env-file=.env.local scripts/migrate.mjs`. `.env.local` must set `WEFT_MIGRATION_TARGET=development`; plain `pnpm db:migrate` requires those variables already exported. Do not run migrations at application startup. See [Attendee CSV imports](docs/backend/attendee-imports.md) for append, duplicate, replay and rollout behavior.

Authentication uses Clerk sessions mapped to local PostgreSQL identities and memberships. Console access currently requires an active Owner or Organizer membership; provider organization membership alone grants no local role. See [authentication](docs/backend/authentication.md), [invitation onboarding](docs/backend/invitation-onboarding.md), and [customer provisioning](docs/backend/customer-provisioning.md) for configuration and remaining live verification.

Vercel deployments build the app and then apply pending Drizzle migrations before publishing. Configure separate Production and Preview database credentials and migration targets before deploying this change; see [Vercel deployment setup](docs/backend/vercel-deployment.md). Local `pnpm build` does not run migrations.

Project guidance starts at [AGENTS.md](AGENTS.md) and the [documentation index](docs/README.md). The harness includes [planning](docs/PLANS.md), [verification](docs/VERIFICATION.md), [repository skills](.agents/skills/README.md), and prepared [Git hooks](docs/HOOKS.md). `pnpm check:docs` checks the documentation; `pnpm verify:fast` adds lint and typecheck; `pnpm verify` also runs tests. Hook activation is a separate local step.
