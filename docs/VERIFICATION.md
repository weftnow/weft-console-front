# Verification

Run commands from the repository root unless noted. Install with `pnpm install` using the committed lockfile and pnpm 10.10.0. Node must support the existing provisioning TypeScript-stripping flags; this setup was exercised on Node 23.9.0. Dependencies must be installed before lint, types, tests, or builds. Read relevant installed Next.js guides before changing framework code.

## Commands and evidence

| Command | What it checks |
| --- | --- |
| `pnpm check:docs` | Required harness paths, AGENTS.md ≤100 lines, conventional local Markdown links |
| `pnpm test:harness` | Temporary valid/broken checker fixtures, real checker CLI, executable Git hooks with stubbed commands and failure propagation |
| `pnpm lint` | Existing ESLint/Next.js rules |
| `pnpm typecheck` | Existing strict `tsc --noEmit` project check |
| `pnpm test` | Existing Node test suite, including harness tests, then typecheck if tests pass |
| `pnpm verify:fast` | Documentation check, lint, typecheck in order; stops on failure |
| `pnpm verify` | Fast verification followed by the existing test command; stops on failure |
| `pnpm build` | Local production Next.js build; does not apply migrations |

The original individual scripts remain available. `pnpm test` already runs typecheck on success, so the aggregate repeats that existing check; it is not removed to shorten verification. A failed test run means the trailing typecheck did not run; report the separate typecheck result.

## Change matrix

| Change | Required checks and acceptance |
| --- | --- |
| Documentation/instructions only | `pnpm verify` under repository completion policy; inspect actual paths, links, status, and diff |
| Harness scripts, manifest, hooks, package scripts | `pnpm test:harness`, `pnpm verify`, and `pnpm build` for build/package tooling edits; test checker success and failure and hook exit behavior |
| Application/service/API/auth/cache changes | `pnpm verify`, focused behavioral cases, `pnpm build`, and affected flows/allowed and denied role paths |
| UI/style changes | Above plus desktop/narrow layout, keyboard/focus, reduced motion, loading/empty/error states, and relevant interactions |
| Database/schema/import/admission changes | Above plus explicit isolated database integration checks for changed transactions/constraints and reviewed migration compatibility |
| Provider/onboarding or deployment changes | Above plus authorized real-boundary acceptance described in the owning backend guide; mocks cannot certify delivery or deployment |

Keep checks proportional to the affected boundary. Broaden or repeat after new edits, failures, or unresolved concerns. Fix scoped failures and report unrelated baseline failures; do not weaken assertions, disable checks, or claim skipped cases passed.

## Environment and integration isolation

Ordinary `pnpm test` uses synthetic fixtures and mocked provider clients. Live database suites are gated by `WEFT_DATABASE_TEST=1`, and require `DATABASE_TEST_URL`. Default verification must not enable that gate or load a production secrets file. The Node test runner does not automatically load `.env.local`; Next.js development/build commands do load their normal environment files. Never print credentials while inspecting configuration.

Database names and environment flags alone do not prove isolation. Confirm the endpoint and intended disposable database first. Existing local/preview/test usage shares the Neon `dev` branch / `weft_console_test`; stop conflicting usage before an authorized database run. Prefer a dedicated scratch database or isolated schema for destructive migration checks. Never point tests at production `weft_console`. See [attendee import isolation](backend/attendee-imports.md) and [deployment/migration boundaries](backend/vercel-deployment.md).

When explicitly authorized and the disposable connection is already exported, run the relevant suite, for example:

```bash
WEFT_DATABASE_TEST=1 node --test tests/attendee-import-database.test.mjs
```

Inspect each test's setup and cleanup before running it. Record rollback/cleanup results; do not reset shared data to make a test pass. Harness fixtures clean up their own temporary directories and require no database or provider access.

Before signed-in browser acceptance, follow the [local runtime preflight and recovery guide](engineering.md#local-runtime-and-authentication-troubleshooting). Use `localhost` consistently, confirm development provider/database targets, and preload local configuration at both build and start for production-artifact acceptance. Verify that `/sign-in` renders the Clerk form; an HTTP 200 alone does not establish a usable sign-in page. For timeouts or a blank form, capture sanitized server/browser errors and resolve the documented hostname or environment cause before reporting a blocker.

Signed-in browser acceptance needs a provisioned development account and the configured Clerk instance, organization mapping, local role, and event grant. Check Owner/Organizer organization-wide access and grant administration, Owner-only Team access, operator granted-event/roster reads and write denial, Wefter minimal-context redaction, sponsor/attendee denial, and unauthenticated/disabled/cross-tenant/revoked denial. For invitation/admission changes, include the recovery, replay, and wrong-account scenarios in [invitation onboarding](backend/invitation-onboarding.md) and [customer provisioning](backend/customer-provisioning.md). Sending an invitation, changing provider settings, provisioning a real customer, applying migrations, or deploying needs the corresponding user instruction.

F01 access transaction coverage is in `tests/event-access-database.test.mjs`. It requires `WEFT_DATABASE_TEST=1` and either a migrated loopback `weft_f01_scratch` database or the direct Neon `dev` / `weft_console_test` target configured in both `DATABASE_TEST_URL` and `DATABASE_MIGRATION_URL`, with `WEFT_MIGRATION_TARGET=development`. The Neon URLs must identify the same non-pooler endpoint and database. The suite checks concurrent first saves, revisions, revocation tombstones, and inactive actor denial; fixtures use random IDs and clean up their rows. Before running on the shared dev database, confirm local/preview use is stopped and obtain explicit authorization for the live test and any required migration. Never target production. If neither approved target is available, leave the test skipped and report that transaction behavior as unverified.

F02 introduces migration `0007_jittery_kabuki.sql`; its gated fixture is `tests/event-settings-database.test.mjs` and requires `WEFT_DATABASE_TEST=1` plus either a migrated loopback database named `weft_f02_scratch` or the direct development Neon database `weft_console_test` configured in both `DATABASE_TEST_URL` and `DATABASE_MIGRATION_URL`, with `WEFT_MIGRATION_TARGET=development`. The Neon exception requires Antonio's explicit authorization for this target and confirmation that local/preview use is stopped; fixtures use random IDs and clean up their own rows. Never target production. Cover concurrent first settings saves, independent settings revisions, event-window/timezone boundaries, Wefter grant and schedule revision races with F01 access edits, tombstone reuse, mode-conversion clearing, and active/inactive/cross-organization denial. Inspect fixture setup and cleanup before running it. Unit tests do not establish PostgreSQL transaction behavior.

Do not run `pnpm build:vercel` as a verification shortcut: it applies migrations. A local build may need configured public Clerk values and network access for fonts. Record prerequisite/network failures distinctly from application failures. Browser/manual acceptance is required for affected user flows, not for a documentation-only reorganization.

## Documentation checker limits

The [manifest](../scripts/harness.json) names actual canonical paths and Markdown roots. The [checker](../scripts/check-harness.mjs) resolves the repository from its installed location, so direct invocation works from another cwd. It checks required paths, the entry-point line limit, active-plan directory shape, local inline links/images and reference-definition targets, including percent encoding and angle-bracket destinations. It rejects repository escapes, skips fenced/inline code and external URLs, and does not traverse symlinked directories.

This is a small conventional Markdown checker, not a complete parser. It does not validate anchors, unused/undefined reference labels, MDX, HTML links, remote URLs, code-formatted paths, or complex nested/escaped link grammar. Required canonical paths are separately listed in the manifest. Extend the checker and its fixtures if the repository adopts syntax beyond these limits.

## Handoff

Record exact commands/results and actual acceptance evidence in the relevant active plan. Include pass/fail/skip counts where useful, prerequisite failures, remaining manual/integration checks, and the next action. Inspect `git diff --check`, the full diff, and status; preserve unrelated changes. Hook results describe the working tree and do not prove an exact partial staged/pushed snapshot. New CI should run the same commands against its checked-out commit; no CI workflow existed at setup.
