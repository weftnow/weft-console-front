# Replace the repository engineering harness

Status: Complete
Owner: current agent
Created: 2026-10-17

## Goal and acceptance criteria

Replace the previous Superpowers planning structure with the local project-harness-setup skill's model-neutral workflow. Keep existing product requirements, application behavior, custom configuration, and historical planning content.

- Canonical guidance routes to real project files; AGENTS.md remains at most 100 lines and retains the generated Next.js rules.
- Plans, specifications, documentation index, verification, hooks, debt, and the three starter skills have one documented home.
- Historical plans retain their content and uncertain verification status; moving them does not certify completion.
- A dependency-free Node checker validates required paths, instruction length, and local Markdown links; fixtures cover both success and failure.
- Prepared Git hooks propagate check failures without changing source or the index. Activation remains explicit.
- Existing lint, typecheck, and test commands run; any baseline failures are recorded without weakening checks.

## Context

The user explicitly requested replacement using the locally installed setup skill. Existing docs reference nonexistent domain, engineering, ADR, and root specification paths. Product and design references already exist and remain canonical. The code implements Clerk authentication, organization access, event persistence, CSV imports, and customer provisioning; older docs contain stale claims.

The working tree initially contained one untracked plan: `docs/superpowers/plans/2026-10-05-production-customer-provisioning.md`. Preserve its substantive content during the authorized plan migration. Existing `.codex/config.toml` and the `CLAUDE.md` forwarder are compatibility configuration. No custom Git hooks, hooksPath, or CI workflow were found.

## Steps and progress

- [x] Read the setup skill, references, existing instructions, docs, source boundaries, manifests, tests, and hook configuration.
- [x] Replace routing and migrate historical plans/specs, preserving uncertain status.
- [x] Add project-specific workflow docs, starter procedures, checker, and prepared Git hooks.
- [x] Exercise valid/broken checker fixtures and hook failure propagation.
- [x] Run repository checks, inspect the diff, and record evidence and remaining work.

## Decisions and discoveries

- 2026-10-17: Reuse lowercase `docs/product.md` and the existing two files under `docs/design/`; keep `ARCHITECTURE.md`. This avoids competing copies.
- 2026-10-17: Historical plans move to `docs/exec-plans/legacy/` with an explicit unverified notice. They have stale unchecked steps and incomplete live verification; they cannot honestly be marked completed or automatically resumed.
- 2026-10-17: Existing specs move to `docs/changes/`; their original status is historical. New unresolved changes use the documented spec lifecycle.
- 2026-10-17: Use Node and the built-in test runner, already required by the project, rather than introduce Python as another prerequisite.
- 2026-10-17: Prepare Git hook scripts; document activation separately. No tool-specific adapter or global configuration is requested.
- 2026-10-17: Preserve the initial untracked production provisioning plan at `docs/exec-plans/legacy/2026-10-05-production-customer-provisioning.md`; retain substantive tasks, checkboxes, recorded failures, and operational constraints. All 19 tracked imported artifacts also retained their task records.
- 2026-10-17: The first CLI fixture exposed macOS symlink normalization between temporary-directory paths and the module entrypoint. Compare real paths before direct execution; the fixture now covers the actual CLI from another cwd and verifies failure exit codes.
- 2026-10-17: Project-local `.agents/skills/` creation required the workspace sandbox's explicit write approval. Approval was granted; only the three starter procedures and catalog were installed there.
- 2026-10-17: Re-evaluated setup against the resulting index, manifest, scripts, skills, and hooks. A second setup reuses the same canonical files, commands, and procedures; no previous planning tree or competing product/design copy remains. The existing configuration and forwarder remain intact.

## Verification

Runtime: Node 23.9.0, pnpm 10.10.0. Results on 2026-10-17:

| Check | Actual result |
| --- | --- |
| `pnpm check:docs` | Pass; all canonical paths and conventional local links resolve; AGENTS.md is 48 lines including the unchanged Next.js block |
| `pnpm test:harness` | Pass, 12/12; custom paths, missing/broken/encoded/angle/reference links, invalid configuration, line limits, symlink traversal/escapes, CLI cwd and failure exits, executable hooks and failure propagation |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` | Exit 1: 238 total, 224 passed, 5 failed, 9 skipped |
| `pnpm verify` | Fast checks pass, then stops on the same five application failures; aggregate failure behavior confirmed |
| `pnpm build` | Pass; optimized production build, TypeScript, static generation, and route output complete |
| `git diff --check` | Pass |
| Migration review | Seven specs and thirteen plans retained; all tracked historical task records compared with HEAD after intended path/directive normalization |
| Compatibility review | No changes to application source, existing tests, lockfile, `.codex/config.toml`, or `CLAUDE.md`; no effective Git hooksPath found, hooks prepared and executable |

The five failures are in unchanged `tests/console-account.test.mjs` and `tests/console-authorization.test.mjs`: missing account organization-selection cleanup, three mismatches between selection expectations and the fail-closed access resolver, and the absent `/select-organization` route. These same account/organization-selection failures were already recorded in the imported production provisioning plan. They are tracked in the [debt tracker](../tech-debt-tracker.md); application repair is outside this harness replacement. Because tests failed, the trailing typecheck inside `pnpm test` did not run; standalone and fast aggregate typecheck passed separately.

No database gate was enabled or provider/browser acceptance performed. Nine gated integration tests were skipped. This documentation/tooling change does not alter user flows or permissions. Hook dispatch tests use temporary stubs; actual lint, typecheck, tests, aggregate verification, and build were also invoked separately. After setup, the user explicitly requested hook activation: local `core.hooksPath` was set to `.githooks`, both resolved paths were inspected through Git, and executable permissions were confirmed.

## Handoff or outcome

The requested harness replacement is complete: concise entry point, canonical project references, current workflow docs, migrated history, three starter procedures, Node documentation checks, fixture coverage, aggregate commands, and prepared executable Git hooks. Setup acceptance requires the new tooling to pass and existing checks to run with honest baseline reporting; it does not certify the unrelated application suite as green.

Start at [the documentation index](../../README.md). Use `pnpm check:docs`, `pnpm verify:fast`, and `pnpm verify`. [Hooks](../../HOOKS.md) are activated in this checkout; other checkouts require their own activation. Pre-push currently stops on the documented application failures. Setup and activation did not push, deploy, apply migrations, deliver invitations, or change global configuration.

Remaining project decisions are existing delivery priorities/permission detail for future staff/sponsor/network workflows, intentional adoption of target design tooling, and a pinned Node runtime. These are visibly open in canonical docs and debt; none blocks this harness setup.
