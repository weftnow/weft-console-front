# Engineering conventions

The repository uses pnpm 10.10.0, Next.js 16.3.5, React 19, strict TypeScript 5, and Tailwind 4. Use the existing `pnpm-lock.yaml`. Provisioning invokes Node's experimental TypeScript stripping, so use a runtime that supports the checked-in flags; setup was exercised on Node 23.9.0. There is no committed Node version pin yet.

## Local runtime and authentication troubleshooting

### Development startup and preflight

Run `pnpm dev --hostname localhost --port 3000` and open `http://localhost:3000`. Use `localhost` for both the server binding and browser origin, including `pnpm start` after a build. Confirm the existing process and port before starting another server; preserve the user's signed-in browser session.

Before browser acceptance, confirm the configured Clerk development instance and the intended Neon `dev` / `weft_console_test` endpoint without printing credentials. Inspect configuration filenames, key prefixes, and sanitized target metadata only. A database name alone does not establish isolation; follow [Verification](VERIFICATION.md#environment-and-integration-isolation) before live tests or mutations.

### Local production build and start

`pnpm dev` and `pnpm build` retain Next.js's default Turbopack bundler. In restricted local runners where Turbopack's plugin child processes cannot bind their IPC sockets, set `WEFT_LOCAL_PLUGIN_THREADS=1` for the command. The installed Next.js version supports `experimental.turbopackPluginRuntimeStrategy: "workerThreads"`, which runs the same plugin work in threads without that socket. The option is off by default and ignored when `VERCEL=1`, so deployed builds retain their existing configuration. This is a local execution option, not a skipped build or a bundler fallback; keep all hooks enabled. Recheck the option against installed Next.js types when upgrading, since it is experimental.

The same local option can be used for an authorized push: `WEFT_LOCAL_PLUGIN_THREADS=1 git push origin <branch>`. The unchanged hook still runs `pnpm verify` and `pnpm build`. Do not use `NEXT_TURBOPACK_USE_WORKER=0` as the repair: that diagnostic compiled successfully but hung during shutdown in this environment.

An ignored `.env.production.local` file takes precedence over `.env.local` during production builds/startup. Next resolves existing process environment first, followed by `.env.production.local`, `.env.local`, `.env.production`, and `.env` for these commands. Inspect which files exist without dumping their contents. `NEXT_PUBLIC_` values are embedded at build time, so changing only runtime configuration cannot repair an artifact built with live Clerk keys.

For local production-artifact acceptance, preload `.env.local` before **both** build and start. Set `VERCEL=0`, `VERCEL_ENV=development`, and `VERCEL_TARGET_ENV=development` in the child process. The following shell function uses the Node environment loader exercised during F03 acceptance and fails before launching pnpm if the key prefixes or database name are wrong. Confirm the endpoint separately as above. Existing exported variables take precedence over Node's `--env-file`; resolve any stale exports before proceeding. Keep the ignored environment files unchanged.

```bash
weft_local() {
  node --env-file=.env.local --input-type=module - "$1" <<'NODE'
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const task = process.argv[2];
assert.ok(['build', 'start'].includes(task), 'Use build or start');
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'), 'Development Clerk secret required');
assert.ok(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'Development Clerk public key required');
let localDatabase = false;
try {
  localDatabase = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1)) === 'weft_console_test';
} catch {}
assert.ok(localDatabase, 'Development database configuration required');

const args = task === 'start'
  ? ['start', '--hostname', 'localhost', '--port', '3000']
  : ['build'];
const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  env: { ...process.env, VERCEL: '0', VERCEL_ENV: 'development', VERCEL_TARGET_ENV: 'development' },
});
process.exit(result.status ?? 1);
NODE
}
# With the port available, start only after a successful build:
weft_local build && weft_local start
```

This procedure builds and starts the app; it does not apply migrations. Ordinary `pnpm verify` / `pnpm test` must continue without loading either secrets file. Do not use `pnpm build:vercel` for local acceptance because it applies deployment migrations.

### Known symptoms and recovery

| Symptom | Proven cause and recovery |
| --- | --- |
| Pages time out; repeated middleware logs, `Failed to proxy http://localhost:3000/...`, `ECONNRESET`, or socket hangups | With Next.js 16.3.5 / Clerk 7.9.10, explicit `--hostname 127.0.0.1` causes a continuation-rewrite loop. Restart the affected local server with `--hostname localhost` and browse that same origin. |
| `/sign-in` returns 200 but the embedded form is blank; browser console says production keys are only allowed for the live domain | A local production artifact contains live Clerk keys, commonly from `.env.production.local`. Rebuild and restart with the development environment preloaded using the procedure above. A runtime override alone leaves the client key unchanged. |
| Cookie-free curl reports Clerk `dev-browser-missing` or redirects to sign-in | Curl has no development browser/session cookies. Inspect the configured signed-in browser; this response alone does not establish an auth failure. |

After recovery, check both the server response and the rendered Clerk form, then exercise an authorized signed-in page. Record sanitized errors, the cause, the recovery command, and the observed result. If the symptoms persist, inspect installed framework/provider code and browser network/console evidence before declaring a blocker or changing authentication code. Local startup recovery does not require changing Clerk production-domain settings.

The hostname loop was reproduced during F03 acceptance: `node_modules/next/dist/server/web/next-url.js` normalizes the rewrite hostname to `localhost`, while the router retains the initial `127.0.0.1` origin. The origin comparison in `node_modules/next/dist/shared/lib/router/utils/relativize-url.js` then treats the rewrite as external and proxies back to the same server. The environment precedence and public-value behavior are documented in the installed `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`. Recheck these details after Next.js or Clerk upgrades.

### Matching simulation (demo mode)

Set `WEFT_ENGINE_MODE=simulation` (for example `WEFT_ENGINE_MODE=simulation pnpm dev --hostname localhost --port 3000`) to replace the two matching-engine readers with the in-process simulator. `matchingEngineMode()` in `src/modules/network/server/engine-mode.ts` returns `"simulation"` only when the flag is set and `VERCEL_ENV !== "production"`; production with the flag still uses the real clients, and a unit test pins that. Nothing is persisted and no engine request is made. Two demo attendee files exist: `public/demo/weft-demo-attendees.csv` (24 guests) and `public/demo/weft-demo-attendees-300.csv` (300 guests, the 24 first). Upload one in a single import. The fixture holds 99 pairs: 12 hand-written among the first 24 guests and 87 templated ones from `node scripts/generate-demo-roster.mjs` (seeded; rerun it to regenerate the 300-guest CSV and `demo-matches-generated.ts`). The generated pairs concentrate on about 60 guests who each have 2 to 5 matches (never more than 5); the rest of the 300 are intentionally unmatched. Simulation is never shown on screen; to confirm it, inspect `data-simulated` on the panels, the `X-Weft-Engine-Mode` response header (`curl -i` or the network tab), or the `weft_matching_simulation_active` banner, which `src/instrumentation.ts` prints once when the server boots. The mode is read per request from the environment, so Vercel previews need the variable set for the Preview environment only. See the [specification](changes/2026-10-20-matching-simulation.md).

## Implementation conventions

Read the relevant installed Next.js guides under `node_modules/next/dist/docs/` before framework changes. Keep `src/app/` adapters thin; business behavior belongs to `src/modules/`, technical integrations to `src/infrastructure/`, and truly cross-capability UI/utilities to `src/shared/`. Use the existing `@/*` → `src/*` alias and explicit imports; avoid barrels mixing server and client exports.

Use Server Components by default and put client state/hooks behind an intentional client boundary. Server database/auth/provider code stays server-only. Follow the existing module's schema, DTO, service, repository, and query patterns where present; do not add empty layers for symmetry. Parse untrusted request and CSV input at the boundary with the existing validators and explicit limits. Preserve sanitized error envelopes.

PostgreSQL owns local identity/role data. Use trusted server actor resolution and organization-scoped authorization in services/repositories. Do not trust a browser-supplied user ID or synchronize provider roles implicitly. Event Detail's query cache must retain its identity and organization scoping; inspect its query/provider tests before changing caching.

Tests use the Node test runner in `tests/*.test.mjs`, with `tests/load-ts.mjs` loading TypeScript and injecting explicit mocks. Use focused behavioral tests for meaningful changed boundaries; source-inspection tests do not prove browser behavior. See [verification](VERIFICATION.md) before running integration tests or standalone scripts.

Do not introduce dependencies without a concrete need. Keep package changes and lockfiles consistent. Do not hand edit `.next/`, `next-env.d.ts`, TypeScript build info, generated route types, or Drizzle snapshots. Generate migration SQL with the existing script, review compatibility, and apply only through the explicit [migration workflow](backend/vercel-deployment.md). Local `pnpm build` builds the app; `build:vercel` also performs deployment migrations and is not a local verification command.

Existing `.codex/config.toml` and the `CLAUDE.md` forwarder are compatibility configuration. Canonical policy lives in [AGENTS.md](../AGENTS.md); repository procedures are plain Markdown under [.agents/skills](../.agents/skills/README.md). Avoid duplicating policy in tool-specific configuration.
