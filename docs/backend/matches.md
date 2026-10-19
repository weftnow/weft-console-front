# Automatic matches

F08 stores the pairs the matching engine selects. A match is an automatic selection. It is **not** guest acceptance, a meeting, a Wefter assignment or a cancellation; those belong to F10–F13. Specification: [F08](../changes/2026-10-19-f08-automatic-matches.md).

## Data

Migration `0013_f08_event_matches` (generated, not applied by application startup) adds:

- `event_matches`: one row per event pair. `guest_low_id < guest_high_id` is a PostgreSQL check, both guests reference `event_guests(id, event_id)`, and `(event_id, guest_low_id, guest_high_id)` and `(event_id, engine_recommendation_id)` are unique. It holds pinned profile versions, directional and pair scores, per-guest benefits, shareable reasons and missing information (JSON keyed by guest ID), evidence, uncertainty, the source run, `introduction_path` (`sms_coordination` or `wefter`, fixed at creation from guest types), `status` (`active` or `revoked`), and `revoked_at` / `revocation_reason` (`guest_excluded`, `pair_blocked`, `identity_resolution_required`, `guest_missing`). There are no acceptance states.
- `event_match_feed_cursors`: one row per event with `last_seq` and `checked_through_run_id`.

## Sync

`src/modules/network/server/match-sync-service.ts` pulls the engine feed (`GET …/matching/feed?after=&limit=`) with the same server-held credential, timeout and no-redirect rules as the status client. It runs when the match list is read and when the status service sees a newly finished run. It reads the cursor, fetches a page outside any transaction, then locks the event row, re-reads the cursor and applies the page only if the cursor did not move. At most ten pages of 200 entries run per call.

- `issued`: both guests must belong to the event, be included in matching, not be blocked, and not be one linked person. A valid entry inserts a match; an invalid one inserts it revoked with the matching reason. A pinned profile version newer than the Console's current version makes the page invalid.
- `revoked`: marks the stored match revoked with the engine's reason. Without a stored match it stores a revoked row.
- Writes use `ON CONFLICT DO NOTHING` for inserts and update only active rows when revoking, so replays are no-ops and a revoked match is never reactivated.
- Entries naming a guest that does not exist in the event cannot be stored and are skipped.
- An unreachable, unconfigured or invalid engine leaves stored matches readable and returns an `unavailable` sync note with the existing reason codes.

## API

Both routes require an active Owner or Organizer of the event's organization and return `Cache-Control: private, no-store`.

| Request | Result |
| --- | --- |
| `GET /api/events/{eventId}/matches?status=active\|revoked` | `{ data: { matches, counts, sync } }`, newest first, at most 1000 |
| `GET /api/events/{eventId}/matches/{matchId}` | `{ data: { match } }` with profiles, reasons, restrictions, earlier introductions, source run and pinned versions; 404 for another event's match |

Contact details are never returned. The list read triggers a sync; the detail read does not.

## Limits

No pagination beyond 1000 rows, no cron (a revocation with no run is seen on the next list read), and no Console lifecycle input to the engine. See the [debt tracker](../exec-plans/tech-debt-tracker.md).
