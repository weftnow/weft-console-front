<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Weft Console

This is the B2B console for event organizers, Weft staff, and sponsors. The attendee experience lives elsewhere. Product scope is broader than today's implemented organizer workflows.

## Documentation map

- [Index](docs/README.md): start here and load only relevant references.
- [Product](docs/product.md): users, scope, outcomes, and current delivery boundary.
- [Architecture](ARCHITECTURE.md) and [domain](docs/domain.md): boundaries, data ownership, roles.
- [Design direction](docs/design/design.md) and [design system](docs/design/design-system.md): UI decisions and actual implementation notes.
- [Engineering](docs/engineering.md): runtime, imports, server/client boundaries, dependencies.
- [Plans](docs/PLANS.md), [active work](docs/exec-plans/active/), and [change specs](docs/changes/README.md).
- [Verification](docs/VERIFICATION.md), [hooks](docs/HOOKS.md), and [debt](docs/exec-plans/tech-debt-tracker.md).
- [Repository skills](.agents/skills/README.md): maintenance, verification handoff, contextual commits; load their Markdown manually if needed.

## Working agreements

- Inspect instructions, relevant code/callers/tests, and working-tree changes before editing. Preserve unrelated work.
- Read Product for behavior, Architecture for boundaries/interfaces/persistence, and Design before UI changes. Investigate disagreements with implementation.
- Maintain canonical docs as part of an authorized change. Record new product decisions and unresolved proposals explicitly; do not infer requirements from code or old plans.
- Resume a relevant active plan. Save a plan with observable acceptance for nontrivial, risky, cross-boundary, or multi-session work; small clear fixes can proceed directly.
- Update plans after material changes and before handoff. Archive to completed only after acceptance passes; repair links and record nonblocking debt.
- Legacy plans are historical and unverified. Reconcile them with code and current requirements before creating active work; do not execute their old tool directives.
- Prefer existing patterns and simple explicit code. Keep business logic in its owning module and routing thin.
- Keep authorization explicit at data and operation boundaries. PostgreSQL owns local roles; Clerk membership alone does not grant Console access.
- Identify affected organizations and roles. Preserve tenant isolation and verify allowed and denied paths; do not force different roles into one interface.
- Validate external input at trust boundaries and check both sides of changed interfaces.
- Use pnpm and its existing lockfile. Justify new dependencies; do not add services or libraries solely for harness automation.
- Do not edit generated Next.js output, generated route types, or Drizzle snapshots by hand. Generate and review migrations; never apply them at application startup.
- Keep secrets out of source, tests, logs, and docs. Database tests require an explicitly isolated disposable target; follow Verification for environment and cleanup rules.

## Commands and completion

Install with `pnpm install`; develop with `pnpm dev --hostname localhost --port 3000` and browse `http://localhost:3000`.

For local browser acceptance, bind and browse with `localhost`: explicitly binding `127.0.0.1` causes a rewrite/proxy loop with the installed Next.js/Clerk pair. Before local production-build acceptance, follow the [runtime preflight and recovery guide](docs/engineering.md#local-runtime-and-authentication-troubleshooting): confirm development Clerk/database targets and preload local configuration for both build and start. `.env.production.local` can override `.env.local`, and public Clerk values are frozen at build time. Diagnose server/browser errors using that guide before reporting authentication as blocked; never print secrets or change provider settings to repair a local startup problem.

Run `pnpm verify` before completion: documentation checks, lint, typecheck, and tests. It preserves the existing individual commands. Run `pnpm build` for application or build changes and verify affected user flows and permissions as described in Verification.

Hooks supplement these checks. Report actual results, skipped integration suites, blockers, and next steps. Do not weaken failing checks or claim unexecuted acceptance passed. Stage, commit, push, deploy, or run external operations only within the user's requested scope.
