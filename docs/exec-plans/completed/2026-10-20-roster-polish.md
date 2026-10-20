# Attendee roster polish

Status: Complete
Created: 2026-10-20

## Goal and acceptance

Simplify the profile column to its type and a single summary of the three currently tracked details (goals, background, LinkedIn). Keep detail editing, duplicate review and networking reachable through aligned controls. Give guest/networking badges comfortable padding. Check desktop and phone layouts, keyboard focus, dismissal and dialog return focus.

All organizations retain existing permissions: Owner/Organizer management controls; roster readers see no management controls. No API, persistence or authorization changes.

## Progress

- [x] Inspect current roster, shared controls, design guidance and unrelated working changes.
- [x] Implement compact profile summaries and grouped row actions using native popovers.
- [x] Run verification/build, browser acceptance and update canonical design notes.

## Verification

Used the existing localhost development server and signed-in Owner session. Sanitized local configuration confirmed development Clerk keys and the development Neon target. No database writes or integration suites were run for this presentation change.

- `pnpm verify`: passed on the final run; 379 tests, 351 passed, 28 gated integration tests skipped, zero failed/cancelled. Documentation, lint and typecheck passed. An initial run encountered matching timeout cancellations while unrelated matching work was changing concurrently; the final complete run passed without modifying that work.
- Focused attendee import client, record validation, profile API/service and networking API suites: 34 passed.
- `pnpm build`: passed with development configuration preloaded and `WEFT_LOCAL_PLUGIN_THREADS=1`. The sandboxed attempt could not fetch Google Fonts; the network-enabled retry compiled and generated routes successfully.
- `git diff --check`: passed. Preserved unrelated matching, dialog and documentation changes, including concurrent edits to shared CSS/design documentation.
- Signed-in browser at the existing desktop viewport and 390×844: compact profile summaries, padded badges, aligned Edit/More controls, all four existing dialogs, and phone badge placement passed. Profile dialog retains individual missing/URL-only states. Search with no results and Show all attendees recovery passed. Menu dismisses on outside click and Escape; Tab enters its actions; dialog close restores focus to More. Restored the viewport override and cleared the test search.
- Read-only access remains guarded by the existing `canManage` conditions. No authorization or data interfaces changed; service/API denial coverage passed in ordinary verification. Did not switch roles or run live permission mutations.
- Reduced motion checked in source: new summary/popover styles introduce no movement; row buttons retain the shared reduced-motion rules. Browser motion emulation was not performed.

## Outcome

Profile type and one three-detail summary replace three chips plus a separate edit link. Bordered Edit/More controls group row actions; the native popover stays above the table scroll area. Guest/networking badges use explicit 5px/11px padding and consistent gaps. Phone badges sit on their own line. Canonical design notes updated. Changes remain uncommitted.
