# Reconcile Console UI branch with main

Status: Complete
Owner: Codex
Created: 2026-10-19

## Goal and acceptance

Merge `origin/main` into `feat/attendee-records-console-polish` without rewriting shared history. Preserve F01–F03 permissions, corrections, identity links and UI polish alongside main's F04 networking and F05 profiles. Keep Turbopack and the local-only plugin-thread option.

- [x] All textual and semantic conflicts are resolved; both feature families remain available with their original permissions.
- [x] Divergent migration histories have a coherent generated snapshot chain and a safe upgrade path from either branch; existing SQL hashes/timestamps are preserved. No shared/production migration is applied.
- [x] Full verification and Turbopack build pass; changed roster controls receive focused acceptance.
- [x] A merge commit is pushed and includes the current main head.

## Findings and approach

Main added networking/profile migrations at 0005/0006 while this branch independently used 0005–0008 for Console access, settings and identities. Drizzle applies migrations after the latest timestamp, so merely concatenating journals would skip older Console migrations on a main database. Preserve both original histories and generate cumulative snapshots; add an explicit reconciliation migration for missing Console capabilities after both histories. Confirm deployed/shared migration state with the user while resolving independent code conflicts.

Keep related guest/profile/networking data rather than choosing one branch's DTO or roster. Preserve all guest IDs and existing profile/block references when identities are linked; do not invent new profile selection or exclusion propagation policy.

## Progress and verification

- [x] Fetch main (4d9cde5), inspect clean working tree and start a non-rewriting merge.
- [x] Resolve code, roster, schemas and documentation locations.
- [x] Reconcile migration histories and test upgrades.
- [x] Verify implementation.
- [x] Commit and push.

### Evidence

- User requested direct verification of deployed migration state. Read-only transactions found production with 0000–0004 and F04/F05 (7 journal entries), but without Console grants/settings/identities; shared development had both original histories (11 entries). No data/schema was changed. See [migration reconciliation](../../backend/migration-history-reconciliation.md).
- Generated cumulative 0009/0010 snapshots and custom 0011. Retained original networking/profile SQL bytes and timestamps after reviewing the generator's unique-constraint ordering. Existing Console SQL is unchanged. Regression tests pin applied hashes/timestamps and contiguous snapshot parent IDs.
- Isolated PGlite PostgreSQL/Drizzle validation passed fresh, main-only, Console-only and combined histories. Existing guest fields, profile versions/private fields, exclusions and do-not-match pairs survive; final schemas match. Verified phone normalization, invalid-phone preservation, replay/no-op, and forced transaction rollback. Tools installed only under `/private/tmp`; no application dependency changed. Log: `/private/tmp/weft-merge-sql-validation/results-final.log`. This is embedded PostgreSQL SQL validation, not shared-database concurrency acceptance.
- `pnpm verify` passed: 320 tests, 294 passed, 26 database-gated skipped, 0 failed; docs/lint/typecheck passed. Updated an old column-specific UI assertion to cover the same networking controls in grouped rows. Contact conflict snapshots are tested independently of the expanded roster DTO.
- Development-preloaded `pnpm build` passed with Turbopack and the existing local plugin-thread opt-in. `drizzle-kit check` passed; generating again reported no schema changes. No live migration command ran.
- Signed-in Owner browser checked profile read/loading, networking dialog, Escape dismissal, exclusion filtering/empty state, missing-profile filter, and phone layout (page width equals its 354px CSS viewport). The native dialog returns focus to its invoker; the fully loaded phone form is 333px wide with no internal horizontal overflow and scrolls within its 745px height. No save, link, exclusion or block was submitted. A stale development process returned event-load failures during schema generation; direct SELECT-only repository validation passed, and restarting the agent-owned local server resolved the stale hot-reload state. Screenshot: `/private/tmp/weft-main-merge-roster.jpg`. Separate-role live sessions were not exercised; automated denial coverage passed.

## Handoff

Merge commit `bf565c1` (parents `e9d4aa3` and latest main `4d9cde5`) is pushed to `feat/attendee-records-console-polish`. Full pre-push verification passed (294 passed, 26 gated database tests skipped, 0 failed) and the Turbopack build passed with the existing local-only opt-in; no hook was bypassed. No unmerged index entries remain, and main is an ancestor of the branch. GitHub reported no open PR for this branch. Its direct comparison reported 13 commits ahead, 0 behind main, with `4d9cde5` as both base and merge base, confirming the merge is conflict-free against that main head. Production/shared-development metadata was read with explicit user authorization, but neither database was modified by these checks.
