# Weft Console

The organizer, Weft staff and sponsor console for business events. The attendee experience lives elsewhere.

Install and run locally:

```bash
pnpm install
pnpm dev
```

Run the project checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The Events backend uses PostgreSQL with Drizzle migrations. It persists Create Event CSV guests and supports append-only CSV imports from an event's Attendees roster. The selected Neon layout is `production` → `weft_console` for real pilot data and `dev` → `weft_console_test` shared by local development and automated tests. Copy `.env.example` to `.env.local`; all local database URLs target `dev` / `weft_console_test`. Treat its data as disposable and stop using the local app while live database tests run. Generate migration SQL with `pnpm db:generate --name=attendee_import_batches`; review it before applying with `node --env-file=.env.local scripts/migrate.mjs`. `.env.local` must set `WEFT_MIGRATION_TARGET=development`; plain `pnpm db:migrate` requires those variables already exported. Do not run migrations at application startup. See [Attendee CSV imports](docs/backend/attendee-imports.md) for append, duplicate, replay and rollout behavior.

Authentication is currently unconfigured. Protected Create Event and Detail pages show an authentication-required state, and protected APIs return 401. The future integration contract, pilot provisioning command, migration rollout and remaining live checks are in [Create Event backend](docs/backend/create-event.md).
