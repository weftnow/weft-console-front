# Matching simulation (demo mode)

Status: Ready — decisions settled with the user on 2026-10-20; implementation in progress
Plan: [Matching simulation plan](../exec-plans/active/2026-10-20-matching-simulation.md)

## Problem

The matching engine is not available for demos. Organizers and stakeholders need to see the full flow (upload attendees, watch matching run, read the resulting pairs) without a real engine.

## Requirements

- `WEFT_ENGINE_MODE=simulation` replaces the two engine readers (status and feed) with an in-process simulator. It is honoured locally and on Vercel previews and refused in code when `VERCEL_ENV=production`.
- Everything after the readers stays real: authorization, the feed cursor, `applyFeedPage` re-checks, introduction paths, list and detail APIs and the UI.
- The simulator keeps no state. The anchor is the `created_at` of the event's latest `event_matching_changes` row of any kind. No row means `idle`. Age 0–6 s is `waiting` (`pendingChanges: 1`), 6–20 s `running`, 20 s and later `finished` with a deterministic run id derived from the event id and the anchor.
- Matches come only from a hand-written fixture of about 12 pairs keyed by email (VIP/Sponsor pairs and Attendee-only pairs), matched to the event's guests through `normalized_email`. Guests not in the fixture are ignored; pairs with a missing member are skipped.
- Issued entries use `seq` = fixture index + 1. Revoked entries are produced for fixture pairs whose guest is excluded (`guest_excluded`) or whose pair is blocked (`pair_blocked`), with `seq = 1000 + ordinal × 100 + pairIndex`, where `ordinal` is the position among the event's change rows (ordered by `created_at`, `id`) of the exclusion or block change that caused it. The fixture is capped at 99 pairs.
- The feed is empty until the run is finished.
- Simulated output passes `engineMatchingStatusSchema` and `engineMatchingFeedSchema`.
- No visible demo label (user decision 2026-10-21). Invisible signals instead: `data-simulated="true"` on the Matching status panel and Matches panel, an `X-Weft-Engine-Mode: simulation` header on successful status, list and detail responses, and a one-time `weft_matching_simulation_active` server log line. The Matches tab refreshes when the status reaches finished.
- `public/demo/weft-demo-attendees.csv` holds 24 fictional guests on `@demo.weft.example`. `public/demo/weft-demo-attendees-300.csv` (added 2026-10-21 at the user's request) holds 300, starting with the same 24. Its extra 87 pairs are templated from role and company by a seeded script, not hand-written, and spread over about 60 guests with up to 5 matches each; the fixture is capped at 99 pairs.
- Themed rosters (added 2026-10-26 at the user's request): `public/demo/weft-demo-ai-summit-300.csv` (Future of AI Executive Summit, 300 guests) and `public/demo/weft-demo-grand-prix-400.csv` (The Grand Prix Business Club, 400 guests), fictional guests on `*.example.com`. Each has its own 99-pair fixture, templated by `scripts/generate-demo-event-matches.mjs` with the same English and Spanish text as the 300-guest roster (`scripts/demo-pairs.mjs`). Rosters share no emails; the simulator uses the fixture with the most pairs present in the event, so one event shows one roster's matches.

## Out of scope

Real engine behavior, persisted simulator state, mixing rosters in one event, any production use, database changes, new dependencies.

## Affected roles and organizations

Reached only after the existing `requireEventCreator` check: active Owners and Organizers of the event's organization, scoped to the caller's event. Everyone else stays denied before the simulator is reached.

## Known limits

- Upload the demo CSV in one import. Pairs whose guests arrive in a later import have a `seq` the cursor has already passed.
- A later change restarts the visible waiting/running phase but adds no new matches.
- Restoring an excluded guest or removing a block does not bring a revoked match back (F08: revoked is final).

## Acceptance scenarios

1. Flag on, Owner uploads the demo CSV: status goes waiting, running, finished in about 20 s; the Matches tab lists the fixture pairs with the right introduction paths and the demo label.
2. Excluding a guest before the run finishes stores that guest's pairs as revoked.
3. After matches show, excluding a guest or blocking a pair replays the run and the affected matches become revoked with the reason.
4. Editing a guest's details replays the run and leaves the matches unchanged.
5. A Wefter or sponsor account is denied; no simulated data is returned.
6. `VERCEL_ENV=production` with the flag selects the real clients. Without the flag, behavior is unchanged.
