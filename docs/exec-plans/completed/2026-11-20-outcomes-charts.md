# Outcomes charts

Status: Complete
Owner: current agent
Created: 2026-11-20

## Goal and acceptance criteria

- Overview shows tracking coverage and clickable event bars. The bars distinguish untracked events from tracked zeroes.
- The organization report can compare completed introductions or unique people introduced by event. The organization and single-event views chart introductions recorded per day in UTC.
- The chart stays in the selected organization and event scope, counts current confirmations, and excludes corrected records. Demo mode produces a read-only sample across several days, including on the pre-Outcomes schema.
- English and Spanish charts support narrow layouts, keyboard navigation and accessible data. Existing empty states cover reports without confirmations.

## Context and decisions

Extend the [Outcomes report](../../backend/outcomes.md) and its [demo projection](../../changes/2026-10-20-matching-simulation.md). Owners and Organizers retain the existing reporting boundaries. Live chart dates represent the time of recording. Demo dates use stable offsets from the first saved fixture match to illustrate the timeline. The change uses existing data, chart dependencies and styles.

## Steps and progress

- [x] Add scoped daily counts and chart components.
- [x] Verify responsive presentation and metric switching in the browser.

## Verification

- `pnpm verify` passed with 392 tests passing and 30 gated skips. Render tests cover tracked zeroes, untracked event links, the localized metric switch and the daily-count table.
- All three Outcomes database tests passed on disposable loopback PostgreSQL, including UTC grouping, event and organization scope, and corrections. Running the real demo feed against schema 0015 confirmed that the timeline matches the simulated Match Detail dates before migration 0017.
- `pnpm build` passed with development Clerk and the demo flag. Signed-in Chrome verified the Overview bars and untracked labels, the event link, English organization and event charts, metric switching, and the Spanish line and daily-count table at 390 pixels. Keyboard semantics use native links, buttons, disclosure, and the existing chart accessibility layer. The test tab, Next.js process, and disposable database were removed.
