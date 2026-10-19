# F07 — Automatic matching updates (Console)

Status: Active — Console implemented; database suite passes on a scratch database; browser and end-to-end acceptance pending
Owner: unassigned (the backlog lists Antonio as the F07 owner)
Created: 2026-10-19
Engine plan: `docs/exec-plans/active/2026-10-19-f07-automatic-matching-updates.md` in the `weft-engine` repository (the source of truth for the cross-repo design)

## Goal and acceptance criteria

When saved Console data changes, the matching engine starts automatically and the Console shows what it is doing. This plan covers the Console half; the engine plan covers polling, coalescing, retry, revocation and the pull feed.

**Acceptance criteria**
- Every change that can alter matching inputs leaves exactly one `event_matching_changes` row in its own transaction: imports that stored guests (`attendees_imported`), attendee corrections (`attendee_corrected`) and explicit identity links (`identity_linked`), plus the five kinds that already existed. Replays, empty imports, conflicts, denials and already-linked pairs leave none.
- The migration is additive, reviewed, generated, and not applied by this work.
- `GET /api/events/{eventId}/matching-status` is limited to active Owners and Organizers of the event's organization, never contacts the engine for anyone else, returns a typed `unavailable` result when the engine cannot be used, and never exposes the service token, the engine address or engine error text.
- Event Overview shows a read-only status panel to users who can manage attendees. It has no start control and shows no fabricated results.

**Out of scope:** the match list, pair storage and introductions (F08), acceptance (F10), cancellation/replacement (F13), availability-triggered matching, and any Console-to-engine push.

**Tenants and roles:** every status read is scoped by the event's organization at the service boundary. Owner and Organizer may read; operator (staff), Wefter, sponsor, inactive, outsider and unauthenticated callers are denied.

## Context

- The Console writes change rows through `recordChange()` in `src/modules/attendees/server/networking-repository.ts`. The engine reads the table with a `SELECT` grant and a column-level `UPDATE (processed_at)` grant; operators apply the grants and no migration creates roles.
- Decisions already made (not reopened): the engine polls; results return through an engine pull feed; recommendations are revoked only on exclusion, a new block, an identity hold or a missing guest; automatic processing is off by default.

## Steps and progress

- [x] **Record the missing change kinds.** Enum values `attendees_imported`, `attendee_corrected`, `identity_linked` and a relaxed `event_matching_changes_guests_valid` check in `src/infrastructure/database/schema/events.ts`; generated with `pnpm db:generate --name=f07_matching_change_kinds` as `drizzle/0012_f07_matching_change_kinds.sql` and reviewed (three `ADD VALUE`, one check swap, no data changes).
- [x] **Write the new change rows.** `attendee-import-repository.ts` (only when guests were stored, `guestIds: []`), `attendee-record-service.ts::replaceAttendee` (`[guestId]`, only after a saved revision) and `linkAttendees` (`guestIds: []`, only when records were linked).
- [x] **Engine client.** `src/modules/network/server/matching-engine-client.ts` (`server-only`; `fetch` with `AbortSignal.timeout`, no redirects, zod validation; reads `WEFT_ENGINE_URL` and `WEFT_ENGINE_SERVICE_TOKEN`, both added to `.env.example` without values).
- [x] **Status route, handler and service.** `src/app/api/events/[eventId]/matching-status/route.ts` → `src/infrastructure/http/matching-status-handler.ts` → `src/modules/network/server/matching-status-service.ts`.
- [x] **Read-only status panel.** `src/modules/network/components/matching-status-panel.tsx` (copy in `matching-status-copy.ts`), rendered in the Event Overview's primary column for users who can manage attendees; polls every 5 s while waiting or running and every 30 s otherwise.
- [x] **Unit and contract tests.** Migration regex test, handler/service/client tests and panel tests.
- [x] **Database tests (`WEFT_DATABASE_TEST=1`).** `tests/matching-change-log-database.test.mjs` (import, correction and link write exactly one row each; replays, conflicts, denials and already-linked pairs write none; the relaxed check still rejects malformed rows) passes on a throwaway local database with migrations 0000–0012 applied.
- [x] **Docs.** `docs/backend/networking-participation.md`, `docs/backend/attendee-profiles.md`, `docs/product.md`, the debt tracker and this plan.
- [ ] **Signed-in browser acceptance** of the panel (Owner/Organizer visible, other roles hidden or denied, narrow layout, keyboard, reduced motion) and the end-to-end run in the engine plan.

## Decisions and discoveries

- **2026-10-19: the check compares `kind::text`.** Postgres cannot use an enum value in the transaction that adds it, and Drizzle applies pending migrations in one transaction; comparing as text keeps one migration safe.
- **2026-10-19: a stale correction, a conflict and a denied actor write no row; a saved correction always writes one**, even when every field is unchanged, because the revision bump still changes the matching snapshot.
- **2026-10-19: link rows are event-level (`guestIds: []`)** because a linked group can exceed the log's two-guest limit.
- **2026-10-19: the panel sits in the Overview primary column**, not the right rail, to avoid breaking the rail's three-column layout at medium widths. It is rendered only when `event.attendees.canManage` is true, which matches the route's Owner/Organizer rule.
- **2026-10-19 (deviation): `tests/merge-contracts.test.mjs` was updated.** It pinned the journal's last entry to `0011_reconcile_console_history`. It now requires entry 11 to stay `0011` and the last entry to be `0012`; the applied-hash and snapshot-chain checks are unchanged.
- **2026-10-19: `pnpm exec next typegen` regenerated the route types** for the new route (generated output is not hand-edited and is not committed).
- **Status copy** deliberately avoids engine codes and messages: a failed or invalid result tells the organizer matching will try again on the next saved change, nothing more.

## Verification

Run on 2026-10-19 (Node via the repo's pnpm 10.10.0; no database, provider or engine contacted):
- `pnpm typecheck`, `pnpm lint` → clean.
- `pnpm verify` (docs check, lint, typecheck, tests) → 336 tests: 309 passed, 0 failed, 27 skipped. The skips are database-gated suites, including the new `tests/matching-change-log-database.test.mjs`.
- `pnpm build` → success, run through the documented guarded local wrapper (development Clerk keys and `weft_console_test` confirmed by prefix/name only; no secrets printed). The route table lists `/api/events/[eventId]/matching-status`.
- Scratch-database run (throwaway local Postgres, port 55432, removed afterwards; never a shared or Neon database): `pnpm db:migrate` applied all 13 migrations including 0012; `matching-change-log-database` passed; `attendee-import-database` (4) and `attendee-record-database` (1, on a `weft_f03_scratch` database) still pass. `networking-database` and `profile-database` fail because their fixtures insert guests without `person_id`; this is an existing gap, not caused by F07 (worth a separate fix).
- Not run: applying migration 0012 to any shared or development database, signed-in browser acceptance, the local end-to-end run with the engine.

## Handoff or outcome

**Next action:** apply migration 0012 to the development database only with explicit authorization, then do the signed-in browser check and the end-to-end run listed in the engine plan.

**Known limits** (also in the [debt tracker](../tech-debt-tracker.md)): settings and Wefter edits write no change row; the status panel stays "not connected" until the engine address and token are configured; availability triggers are undecided.
