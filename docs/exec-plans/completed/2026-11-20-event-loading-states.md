# Visual loading states for event workflows

Status: Complete
Owner: Codex
Created: 2026-11-20

## Goal and acceptance criteria

- Event creation reserves the form and summary layout while the route loads. Submission keeps a stable action footprint and indicates work inside the action.
- Matching checks show a local skeleton. Queued and running phases have a visual indicator, with labels for their distinct engine states. Completed, disabled and failed phases reflect the engine response.
- Matches show a table skeleton on first load. Search keeps its focus and existing rows during a request with a small indicator beside the status filters. Match details and introduction outcomes show local skeletons.
- The attendee and event management panels use local loading UI where data or submissions wait for the server. The layouts fit desktop and narrow viewports and the indicators remain visible with reduced motion.
- Event creation and matching retain their Owner and Organizer access rules. Existing staff permissions, selected organization boundaries, retry behavior, and error messages are preserved.

## Context

The Events layout owns the navigation. The event detail page already uses a content-column skeleton. Initial Matches, status and related panel states rely on loading text, and the creation summary swaps its action label for a pending word. The F07 and F08 plans track the existing matching behavior.

## Steps and progress

- [x] Audit event and matching loading states and identify reusable visual patterns.
- [x] Implement localized visual loading states.
- [x] Run focused checks, desktop and narrow browser checks, aggregate verification and production build.

## Decisions and discoveries

- Search and pagination share one indicator beside the result filters. The same controls and rows retain their layout during the request.
- Matching uses a stationary queued indicator and an indeterminate running track. Disabled, completed and failed states show their status without a progress track.

## Verification

- `pnpm verify` passed with 464 tests, including 428 passes and 36 database-gated skips. Focused tests cover accessible initial loaders, queued and running matching, disabled matching, and scoped search results.
- `pnpm build` passed with development configuration preloaded and `WEFT_LOCAL_PLUGIN_THREADS=1`.
- Headless Chrome with the production stylesheet and synthetic delayed responses passed at 1440 px and 500 px with reduced motion enabled for the narrow run. Checks covered the creation layout, centered and size-stable create and import buttons, failed creation retaining the draft, successful creation navigating to detail, initial and queued/running/completed matching states, stable search focus and table position, and the Match Detail dialog's responsive skeleton and error transition.
- Signed-in browser acceptance, external matching engine requests, and live database suites were skipped.

## Handoff or outcome

Localized skeletons and indicators are in place in the event workflows. Matching and search continue to use their existing requests and authorization boundaries.
