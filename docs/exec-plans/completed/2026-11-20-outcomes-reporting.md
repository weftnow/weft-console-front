# Outcomes reporting

Status: Complete
Owner: current agent
Created: 2026-11-20

## Goal and acceptance criteria

- [x] Owners and Organizers can open Outcomes from the sidebar or Overview, see organization totals and inspect an event. Event Insights links into the same report.
- [x] Tracked events with zero completions, untracked events, partial tracking, loading and failures read distinctly. Render tests and dictionary parity cover localized copy.
- [x] An Owner or Organizer can start event tracking, confirm an actual meeting from a saved match and remove a confirmation recorded in error. Repeated requests count once, and stale conflicting writes require review.
- [x] A scheduled or selected pair alone contributes zero. Event-level people counts deduplicate canonical event-local identities. Simulation contributes no results.
- [x] Requests from disallowed roles, inactive or unauthenticated users, and outside the selected organization expose no reporting or recording data.
- [x] Verification and signed-in acceptance ran with a disposable loopback database and the development Clerk instance.

## Context and decisions

- `event_matches` contains engine-selected pairs. The engine's checked-out product and architecture documents place accepted, active and completed introductions upstream. No completion source was found in the Console or sibling Weft checkouts.
- Use an explicit organizer confirmation for a meeting that actually took place, in person or remotely, for either introduction method. The stored timestamp records when it was confirmed. Coverage starts when an organizer enables tracking for an event. No automatic historical backfill is inferred.
- One recorded outcome per event match. A subsequent match revocation does not undo a real meeting. Corrections are explicit and retain an audit trail.
- Use the selected organization and active local Owner/Organizer membership. Counts are aggregate-only, event-local identities never roll up as unique people across events, and sponsor reporting remains outside this change.

## Steps and progress

- [x] Confirm the source boundary and choose a minimal recording workflow.
- [x] Integrate the Codex persistence and Antigravity report UI worktrees with the recording flow.
- [x] Review the generated migration, permissions, calculations, and visible states. Update the product, domain and [backend documentation](../../backend/outcomes.md).
- [x] Run the repository checks and record the outcome.

## Verification

- `pnpm verify` passed with 390 tests passed, 30 gated skips and zero failures. `pnpm build`, `pnpm exec drizzle-kit check`, and `git diff --check` passed.
- PostgreSQL 18 on loopback passed all three Outcomes tests with `WEFT_DATABASE_TEST=1` and `DATABASE_TEST_URL` targeting `weft_outcomes_scratch`. An independent upgrade applied migration 0017 over migration 0016 with an existing event. The existing event remained untracked, and replaying the migration command succeeded.
- Signed-in Chrome on the local production build verified event tracking at zero, the Owner recording a meeting, agreement between Overview and Outcomes, and the Organizer removing that same confirmation in Spanish. The event total and people count returned to zero. The event filter worked by keyboard at 390 pixels. Both languages rendered at desktop and narrow widths. Reduced-motion rules were checked in source.
- A different tenant’s event ID opened the safe not-found page. Signed-in staff were redirected from the report and the direct recording read returned forbidden. Anonymous requests returned a redirect for the report and `401` for the recording API. The database and route suites covered the remaining denied roles, concurrency, stale writes, simulation, and identity deduplication.
- The temporary browser tab, Next.js process, and PostgreSQL cluster were removed after testing.

## Handoff

Apply migration 0017 through the normal migration workflow when deploying the application. Local acceptance used development Clerk and synthetic events.
