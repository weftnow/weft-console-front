# Engineering conventions

The repository uses pnpm 10.10.0, Next.js 16.3.5, React 19, strict TypeScript 5, and Tailwind 4. Use the existing `pnpm-lock.yaml`. Provisioning invokes Node's experimental TypeScript stripping, so use a runtime that supports the checked-in flags; setup was exercised on Node 23.9.0. There is no committed Node version pin yet.

Read the relevant installed Next.js guides under `node_modules/next/dist/docs/` before framework changes. Keep `src/app/` adapters thin; business behavior belongs to `src/modules/`, technical integrations to `src/infrastructure/`, and truly cross-capability UI/utilities to `src/shared/`. Use the existing `@/*` → `src/*` alias and explicit imports; avoid barrels mixing server and client exports.

Use Server Components by default and put client state/hooks behind an intentional client boundary. Server database/auth/provider code stays server-only. Follow the existing module's schema, DTO, service, repository, and query patterns where present; do not add empty layers for symmetry. Parse untrusted request and CSV input at the boundary with the existing validators and explicit limits. Preserve sanitized error envelopes.

PostgreSQL owns local identity/role data. Use trusted server actor resolution and organization-scoped authorization in services/repositories. Do not trust a browser-supplied user ID or synchronize provider roles implicitly. Event Detail's query cache must retain its identity and organization scoping; inspect its query/provider tests before changing caching.

Tests use the Node test runner in `tests/*.test.mjs`, with `tests/load-ts.mjs` loading TypeScript and injecting explicit mocks. Use focused behavioral tests for meaningful changed boundaries; source-inspection tests do not prove browser behavior. See [verification](VERIFICATION.md) before running integration tests or standalone scripts.

Do not introduce dependencies without a concrete need. Keep package changes and lockfiles consistent. Do not hand edit `.next/`, `next-env.d.ts`, TypeScript build info, generated route types, or Drizzle snapshots. Generate migration SQL with the existing script, review compatibility, and apply only through the explicit [migration workflow](backend/vercel-deployment.md). Local `pnpm build` builds the app; `build:vercel` also performs deployment migrations and is not a local verification command.

Existing `.codex/config.toml` and the `CLAUDE.md` forwarder are compatibility configuration. Canonical policy lives in [AGENTS.md](../AGENTS.md); repository procedures are plain Markdown under [.agents/skills](../.agents/skills/README.md). Avoid duplicating policy in tool-specific configuration.
