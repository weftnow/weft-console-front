# Matching simulation (demo mode)

Status: Active — implemented; signed-in browser acceptance pending
Owner: current agent
Created: 2026-10-20
Specification: [Matching simulation](../../changes/2026-10-20-matching-simulation.md)

## Goal and acceptance criteria

F07/F08 wired the Console to the real matching engine: the status poll and the feed sync call two HTTP clients, and valid `issued` entries become `event_matches` rows. The engine is not available for demos. With `WEFT_ENGINE_MODE=simulation`, uploading the fixed demo CSV plays the whole process out: status goes *waiting → running → finished*, then the Matches tab fills with hand-written pairs. No real matching runs.

- Simulation is on only when `WEFT_ENGINE_MODE=simulation` and `VERCEL_ENV !== "production"`. The guard is in code; production plus the flag selects the real clients.
- With simulation on, no engine request is made. With the flag unset, behavior is unchanged ("not connected").
- Authorization (`requireEventCreator`, Owner/Organizer only), tenant scoping and `applyFeedPage` are unchanged. Simulated output is parsed through `engineMatchingStatusSchema` and `engineMatchingFeedSchema` before it is returned.
- The simulator keeps no state. The timeline is anchored on the latest `event_matching_changes` row of any kind: 0–6 s `waiting` (`pendingChanges: 1`), 6–20 s `running`, then `finished` with a deterministic run id.
- The feed returns `issued` entries (`seq` 1..N from the fixture index) and `revoked` entries for fixture pairs whose guest is now excluded (`guest_excluded`) or whose pair is blocked (`pair_blocked`), with `seq = 1000 + ordinal × 100 + pairIndex`. Until the run is finished the feed is empty.
- No demo label is shown (user decision 2026-10-21, replacing the earlier label requirement). The Matches tab refreshes when the status reaches finished.
- No new dependencies and no database migrations.

**Out of scope:** real engine behavior, persisted simulator state, multiple demo datasets, any production use.

**Tenants and roles:** reached only after `requireEventCreator`, so Owner and Organizer of the event's organization; it reads only the caller's event. Operator, Wefter, sponsor, attendee, inactive, outsider and cross-tenant callers stay denied by the unchanged checks.

## Context

- Builds on F07 (`b184fd9`) and F08 (`2cd8796`); both services already inject `readStatus` / `readFeed`.
- Proposed design is recorded in the change spec; settled decisions came from the user on 2026-10-20 and are not reopened.

## Steps and progress

- [x] **0. Docs.** This plan, the change spec, index entry.
- [x] **1. Mode guard.** `engine-mode.ts` with `matchingEngineMode`, `selectStatusReader`, `selectFeedReader`.
- [x] **2. Fixture and demo CSV.** `public/demo/weft-demo-attendees.csv` (~24 guests on `@demo.weft.example`), `simulation/demo-matches.ts` (~12 pairs).
- [x] **3. Simulator.** `simulation-repository.ts`, `simulated-engine.ts`.
- [x] **4. Wiring.** Services use the selected readers; `simulated` flag on status and list schemas.
- [x] **5. UI.** Demo label in both panels; invalidate matches when the status reaches finished.
- [x] **6. Tests.** `tests/matching-simulation.test.mjs`.
- [x] **7. Docs.** `.env.example`, product, engineering, debt tracker, index.
- [ ] **8. Verification.** `pnpm verify`, `pnpm build`, local browser check.

## Decisions and discoveries

- **2026-10-20 (user):** simulation on locally and on previews; refused when `VERCEL_ENV=production`. One fixed CSV and a fixture keyed by email. No state; timeline anchored on the latest change row of any kind. Revocation `seq` as above.
- **2026-10-21:** added a 300-guest roster (`scripts/generate-demo-roster.mjs`, seeded) with 87 templated pairs beside the 12 hand-written ones, reaching the 99-pair cap. Also fixed event creation to record `attendees_imported` for an initial roster; without it the simulator stayed idle.
- **2026-10-20:** the feed returns nothing until the simulated run is finished, so a list read during waiting/running cannot reveal matches early. `nextCursor` stays at `after` then.

## Verification

Planned: unit tests (mode guard, timeline boundaries, schema conformance, unknown emails, pagination, revocation seq, fixture integrity against the CSV); `pnpm verify`; `pnpm build`; local browser check with `WEFT_ENGINE_MODE=simulation pnpm dev --hostname localhost --port 3000` covering Owner flow, exclusion/block/edit replays, denied roles, and the unchanged "not connected" path without the flag.

Results (2026-10-21):
- `tests/matching-simulation.test.mjs`: 14 tests passed (mode guard, readers, timeline boundaries, run-id restart, empty-until-finished feed, schema conformance, unknown/missing guests, paging, exclusion/block revocation seq, fixture vs CSV, server CSV parser, `simulated` flag and denial-before-simulator, demo label).
- `pnpm verify`: 374 tests, 346 passed, 0 failed, 28 skipped (database-gated suites).
- `pnpm build`: success via the guarded local wrapper (development Clerk keys, `weft_console_test`). The production build served on localhost:3001 returned 200 for `/demo/weft-demo-attendees.csv`.
- **Not run:** the signed-in browser check. The Claude Chrome extension was not connected, and port 3000 was already held by another `next-server`, which was left alone. No event was created and no database was written to. Role denial and the unflagged "not connected" path are covered only by unit tests.
- Deviation: `tests/no-demo-data.test.mjs` pinned `public/` to the brand mark; it now also allows exactly `public/demo/weft-demo-attendees.csv`.

## Handoff or outcome

**Known limits (to document):** upload the demo CSV in one import; pairs whose guests arrive in a later import have a `seq` the cursor has already passed. A later change restarts the visible running phase. Restoring a guest or removing a block does not bring a revoked match back (F08: revoked is final).

**Next action:** run the browser checks from the specification's acceptance scenarios with `WEFT_ENGINE_MODE=simulation pnpm dev --hostname localhost --port 3000`, then move this plan to completed.
