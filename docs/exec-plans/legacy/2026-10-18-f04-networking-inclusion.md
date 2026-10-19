# F04 — Networking inclusion and exclusions

## Context

Backlog F04 (Sheary, Phase 2): every imported guest is in the event's matching pool by default; organizers can exclude/restore a guest and save matching restrictions. Saved changes must notify F07 (automatic matching, Antonio — not built yet). Exclusions must survive new imports and future duplicate fixes (F03, not built). No manual enrollment, no profile-completeness gate.

Decisions confirmed by user:
- **Who:** owners and organizers only. Event staff cannot.
- **Exclusion reason:** picked from a fixed list for now. Proposed values (to confirm): `guest_request`, `organizer_decision`, `not_attending`, `other`.
- **Restrictions = do-not-match pairs only** (guest A is never matched with guest B in this event).
- **No supplied design yet:** extend the existing attendee roster; excluded guests stay visible with a label and filter.
- **F02** was built by Antonio; it isn't on any branch here, and F04 doesn't depend on it.
- **F07 contract:** not agreed yet, so don't design it now. Keep a simple append-only change log written in the same save, so F04 meets "saving notifies F07" without guessing F07's details.

Current state found in repo:
- Guests: `event_guests` in `src/infrastructure/database/schema/events.ts`. Import is append-only and skips existing emails (`src/modules/events/server/attendee-import-repository.ts`) — so re-import already can't restore an excluded guest; we only need a test.
- Access: only active owner/organizer may touch the roster; checked under row lock (membership → event), via `canCreateEvent` in `src/modules/organizations/service.ts`.
- No matches table (F08), F07, F03 identity hold, or F02 code exists on any branch — F04 must not depend on them.
- Latest migration: `drizzle/0004_*`; `docs/domain.md` and `docs/engineering.md` don't exist.

## Data model (migration `drizzle/0005_*`, via `pnpm db:generate`)

1. **`event_guests` new columns** (existing rows default to included — this *is* "included by default"):
   - `networking_status` enum `event_guest_networking_status` (`included` | `excluded`), not null, default `included`
   - `networking_excluded_at` timestamptz null, `networking_excluded_by` uuid → users null, `networking_exclusion_reason` enum `event_guest_exclusion_reason` null (fixed list above)
   - `networking_version` integer not null default 1 (optimistic concurrency — F01 "don't silently overwrite")
   - check: excluded ⇔ excluded_at, excluded_by and exclusion_reason all not null; included ⇒ all three null
   - add `unique(id, event_id)` so other tables can FK `(guest_id, event_id)`
2. **`event_guest_match_blocks`** (do-not-match pairs)
   - `id` uuid pk, `event_id`, `guest_low_id`, `guest_high_id`, `reason` text null (≤ 500), `created_by` → users, `created_at`
   - composite FKs `(guest_*_id, event_id)` → `event_guests(id, event_id)` on delete cascade
   - check `guest_low_id < guest_high_id` (canonical order: A+B = B+A, no self-block); unique `(event_id, guest_low_id, guest_high_id)`
3. **`event_matching_changes`** (append-only outbox / history; never updated except `processed_at` by F07)
   - `id` uuid pk, `event_id`, `kind` enum (`guest_excluded`, `guest_restored`, `match_block_added`, `match_block_removed`), `guest_ids` uuid[] (1–2), `actor_id` → users, `reason` text null, `created_at`, `processed_at` timestamptz null
   - index `(event_id, processed_at, created_at)` for F07 polling
   - This row is also the signal that F08/F13 use to flag affected active matches once those exist.

## Module layout (capability = `attendees`; route files stay thin)

- `src/modules/attendees/networking-schemas.ts` — zod: participation input `{ status, reason (required when excluding, fixed list), expectedVersion }`, block input `{ guestIds: [a, b], reason? }`, DTOs.
- `src/modules/attendees/networking-eligibility.ts` — pure, shared with F07/F08: `canonicalPair(a, b)`, `isIncludedInMatching(guest)` (later AND F03 identity-not-on-hold), `isBlockedPair(blocks, a, b)`.
- `src/modules/attendees/server/networking-service.ts` — validation + pure decision functions (`decideParticipationChange`, `decideMatchBlock`) with injectable dependencies, mirroring `attendee-import-service.ts`.
- `src/modules/attendees/server/networking-repository.ts` — transactions: lock membership → event → guest row(s) (same order as import), apply decision, insert outbox row, bump `events.updated_at`.
- `src/modules/attendees/mutations/update-networking.ts`, `mutations/match-blocks.ts` — client fetchers, same shape as `src/modules/events/mutations/import-attendees.ts` (error schema must include `CONFLICT`).
- `src/infrastructure/http/networking-handlers.ts` — same guards as `import-attendees-handler.ts`: actor, uuid checks, same-origin, `readBoundedJson`, `errorResponse`, `Cache-Control: private, no-store`.

## API

| Method & path | Body | Result |
|---|---|---|
| `PATCH /api/events/[eventId]/guests/[guestId]/networking` | `{ status: "excluded"\|"included", reason (required when excluding, one of the fixed list), expectedVersion }` | 200 updated participation; 409 `CONFLICT` with latest saved participation if version stale; same status = 200 no-op (no outbox row) |
| `POST /api/events/[eventId]/match-blocks` | `{ guestIds: [a, b], reason? }` | 201 new block; 200 existing block for same pair in either order; 422 same guest twice / guest not on this event |
| `DELETE /api/events/[eventId]/match-blocks/[blockId]` | — | 204; 404 if not on this event |

Rules: owner/organizer only (403 otherwise, rechecked under lock); 404 for event/guest not in the event; excluded guests keep their blocks; exclusion does not delete anything.

Event Detail read: extend `findById` in `src/modules/events/server/repository.ts` and `guestSchema` in `src/modules/events/event-dto.ts` with `networking: { status, excludedAt, reason, version }` per guest, plus `attendees.matchBlocks[]`. Update `EventRecord` types in `src/modules/events/event-record.ts`.

## UI (`src/modules/events/components/attendee-roster.tsx`)

- New **Networking** column: status pill (`Included` / `Excluded`) using existing `status-pill` classes.
- New filter select: All / Included / Excluded (same pattern as guest-type filter).
- Row action **Manage** opens an inline panel (pattern of `AttendeeImportPanel`) in a new `networking-panel.tsx`:
  - Exclude (reason required, chosen from the fixed list) / Restore button; on 409 show "Someone else changed this guest" with the latest saved state.
  - Do-not-match list for this guest + add-block picker searching the existing roster; remove block.
- After save, refresh via the existing event-detail refresh used by `onImportSaved` (`src/modules/events/queries/event-detail-query.ts`); rename prop to `onRosterChanged`.
- Subtitle shows "N included · M excluded".

## Integration contracts to agree with Antonio (review items)

- Outbox shape/kinds and that F07 marks `processed_at`; whether import completion should also write an outbox row (F07 owns that trigger — suggest `attendees_imported` kind in the same table).
- `isIncludedInMatching` / `isBlockedPair` as the single eligibility source for F06/F07/F08.
- F03 merge rule: exclusion wins when merging duplicates; blocks are re-pointed to the main record and deduplicated by canonical pair.
- F08/F13: an exclusion outbox row means "flag this guest's active matches for cancellation"; F12 stops Wefter work.

## Docs

- `docs/backend/networking-participation.md` (model, API, permissions, outbox contract, boundaries) — same style as `docs/backend/attendee-imports.md`.

## Verification (when implementing — not now)

- Unit tests (`tests/*.test.mjs`, node test runner like existing ones): schema validation, `canonicalPair`, decision functions (forbidden role, stale version → conflict, no-op, self-block, duplicate pair in reverse order).
- Handler tests: origin, uuid, 401/403/404/409/422 mapping (pattern of `tests/attendee-import-api.test.mjs`).
- DB tests (`WEFT_DATABASE_TEST=1`, shared dev DB rules in attendee-imports doc): migration defaults existing guests to included; exclusion writes outbox row atomically; concurrent exclude with same version → one succeeds, one 409; re-import of excluded guest's email leaves them excluded.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`; manual check in `pnpm dev`: exclude/restore, filter, add/remove block, staff/sponsor denied.
