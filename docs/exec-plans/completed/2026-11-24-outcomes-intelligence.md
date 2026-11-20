# Outcomes intelligence reports

Status: Complete

Owner: current agent

Created: 2026-11-24

## Goal and acceptance

- [x] Owners and Organizers can open the seven reports via Outcomes and open an event-scoped report from Event Detail. Filters and report selections are addressable.
- [x] Reports distinguish confirmed meetings, structured organizer-entered evidence, missing data, and measured zeros. Synthetic cases cover denominators, incomplete check-ins, repeat identities, and sponsor and tenant boundaries.
- [x] Organizers can load and correct structured event evidence, with scoped references and conflict detection. Existing event matching, meeting recording, and simulation behavior remain available.
- [x] Review and verify the combined implementation and merge into `feat/matching-simulation`.

## Context and work streams

[Outcomes design](../../changes/2026-11-24-outcomes-reporting-design.md) defines the report views. The target branch already has [meeting confirmation](../../backend/outcomes.md). Reuse those confirmations and keep new reporting files separate from unpublished chart and simulation edits in the target checkout.

- [x] Codex implemented evidence persistence, migration, and scoped reads in `4394c8b`.
- [x] Codex implemented calculations and scenario tests in `f438a4b`.
- [x] Antigravity implemented bilingual report views and visual drill-downs. Parent reviewed, fixed render checks, and committed the worktree as `1f1cfd3`.
- [x] Parent integrated the routes, navigation, evidence editor, and checked the report data against the UI.

## Decisions

- Organizer-reviewed structured event evidence is the initial capture mechanism. It uses roster person IDs and saved match IDs and can be corrected by a revisioned replacement. Attendee check-ins can be collected externally and recorded here.
- Cross-event identity uses explicit organizer-assigned keys within one organization. An organization-wide key links only the people explicitly assigned that key.
- Keep the existing `/outcomes` recorded-meeting summary reachable. The sidebar and Event Insights lead to the seven new reports.
- Check-ins are stored as a pair-level answer at 7 or 30 days. For series comparisons, goal survey evidence declares its reporting age and coverage uses confirmed records up to the same cutoff.

## Verification

- `pnpm verify` passed with 421 tests passing and 36 gated tests skipped. `pnpm build`, `pnpm exec drizzle-kit check`, and `git diff --check` passed.
- Migration 0018 applied over 0017 in a disposable loopback PostgreSQL cluster. With `WEFT_DATABASE_TEST=1`, the reporting evidence and existing Outcomes suites passed all nine tests. The scope tests include Owner and Organizer access, no data for other tenants, revoked roles and staff/Wefter or sponsor grants, and revision races.
- Signed-in Chrome on the local production build opened all seven reports with synthetic data. It verified the latest event selection, 390px width, focus and selected-group links, editor load/save and revision conflict, and Spanish Organizer access. Staff and sponsor access was denied in the UI and API. A different organization's event was hidden. The test used the existing development Clerk session and a disposable database. It exercised genuine requests through a localhost-only fixture relay.
- The Chrome test tab, Next.js process, fixture relay, and scratch PostgreSQL cluster were removed. The initial fast-forward to `9ed18bd` preserved the target checkout's tracked changes and eight untracked files byte for byte.

## Handoff

The implementation is merged locally into `feat/matching-simulation`. Apply migration 0018 through the normal deployment workflow when deployment is requested. The organizer supplies the report evidence. Direct attendee check-ins and sponsor-facing publication remain separate product work.
