# Networking inclusion and exclusions

## Data model

Every `event_guests` row is in the event's matching pool by default. Four columns carry the decision: `networking_status` (`included` | `excluded`), `networking_excluded_at`, `networking_excluded_by` and `networking_exclusion_reason` (`guest_request`, `organizer_decision`, `not_attending`, `other`). A check constraint requires all three exclusion fields when excluded and none when included. `networking_version` starts at 1 and increases on every change; edits send the version they read.

`event_guest_match_blocks` stores do-not-match pairs only. A pair is stored in canonical order (`guest_low_id < guest_high_id`), so A+B and B+A are the same row and a guest cannot block themself. Both guests are bound to the same event by composite foreign keys on `event_guests(id, event_id)`. Blocks survive exclusion and restoration of either guest.

`event_matching_changes` is an append-only log with the guest IDs, actor, optional reason and a nullable `processed_at`. Each row is written in the same transaction as the change it describes, through `recordChange()` in `networking-repository.ts`. Kinds:

| Kind | Written by | `guest_ids` |
|---|---|---|
| `guest_excluded`, `guest_restored` | participation change | the guest |
| `match_block_added`, `match_block_removed` | do-not-match change | the pair |
| `profile_updated` | profile save | the guest |
| `attendee_corrected` | attendee correction (`replaceAttendee`) | the guest |
| `attendees_imported` | CSV import that stored at least one guest | none (event-level) |
| `identity_linked` | explicit identity link that linked records | none (event-level; a linked group can exceed two guests) |

Replayed or empty imports, stale or denied corrections and already-linked pairs write no row. A check constraint requires an empty `guest_ids` for the two event-level kinds and one or two guests for every other kind; it compares `kind::text` so migration 0012 can add the enum values and the check in one transaction.

**F07 consumes this log** ([plan](../exec-plans/active/2026-10-19-f07-automatic-matching-updates.md)). The matching engine polls rows where `processed_at` is null and sets only `processed_at`; nothing in the Console reads or updates it. Operators grant the engine's Console database role `SELECT` on `public.event_matching_changes` and a column-level update: `GRANT UPDATE (processed_at) ON public.event_matching_changes TO <engine role>`. No migration creates roles. The Console never calls the engine to announce a change.

## Matching status

`GET /api/events/{eventId}/matching-status` is read-only and limited to active Owners and Organizers of the event's organization (checked in `getMatchingStatus` with `requireEventCreator`). The server calls the engine's `GET /v1/organizations/{organizationId}/events/{eventId}/matching/status` through `src/modules/network/server/matching-engine-client.ts` using `WEFT_ENGINE_URL` and `WEFT_ENGINE_SERVICE_TOKEN` (server-only, never sent to the browser; plain `http` is accepted only for loopback). Requests time out after five seconds and do not follow redirects. The response is `{ data: { availability: "available", status } }` or `{ data: { availability: "unavailable", reason } }` with reason `not_configured`, `unreachable` or `invalid_response`; engine error text is never forwarded. Event Overview shows a read-only Matching status panel to users who can manage attendees; it has no start control and shows no results.

## API and permissions

| Method and path | Body | Result |
|---|---|---|
| `PATCH /api/events/{eventId}/guests/{guestId}/networking` | `{ status: "excluded", reason, expectedVersion }` or `{ status: "included", expectedVersion }` | 200 participation; 409 `CONFLICT` with `data.participation` holding the latest saved state when the version is stale; same status is a 200 no-op with no log row |
| `POST /api/events/{eventId}/match-blocks` | `{ guestIds: [a, b], reason? }` | 201 new pair; 200 existing pair in either order; 422 same guest twice or a guest not on this event |
| `DELETE /api/events/{eventId}/match-blocks/{blockId}` | none | 204; 404 if the pair is not on this event |

Only active owners and organizers can use these routes. Event staff, sponsors and inactive members receive 403. Membership is checked before the request is accepted and again under the membership row lock, using the import lock order (membership, event, then guest rows). Malformed IDs return 400, wrong origin 403, wrong media type 415 and invalid bodies 422, with `Cache-Control: private, no-store`.

Exclusion deletes nothing. Importing a CSV never changes an existing guest, so an excluded guest stays excluded when their email is imported again.

## Reading

Event Detail returns `networking { status, excludedAt, reason, version }` on every guest and `attendees.matchBlocks[]`. `src/modules/attendees/networking-eligibility.ts` holds `canonicalPair`, `isBlockedPair` and `isIncludedInMatching`, the single place later matching code should ask whether a guest or pair is eligible.

## Boundaries

Not built here: automatic matching, match records and cancellation, duplicate handling, and any consumer of the change log. Open items for those features: whether imports also write a log row, that an exclusion should flag the guest's active matches, and that a duplicate merge should keep the exclusion and re-point blocks by canonical pair.

## Rollout

Migration `drizzle/0009_networking_inclusion.sql` is additive; existing guests become included at version 1. Follow the shared-database rules in [Attendee CSV imports](attendee-imports.md) before applying it. The database tests in `tests/networking-database.test.mjs` run only with `WEFT_DATABASE_TEST=1`.
