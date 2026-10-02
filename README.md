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

The Create Event backend uses PostgreSQL with Drizzle migrations. Copy `.env.example` to a local environment file and set the URLs for an explicitly selected development or test branch. Generate migration SQL with `pnpm db:generate`; review it before applying with `WEFT_MIGRATION_TARGET=development pnpm db:migrate`. Do not run migrations at application startup.

Authentication is currently unconfigured. Protected Create Event and Detail pages show an authentication-required state, and protected APIs return 401. The future integration contract, pilot provisioning command, migration rollout and remaining live checks are in [Create Event backend](docs/backend/create-event.md).
