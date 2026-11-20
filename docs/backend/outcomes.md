# Outcomes reporting

## Organizer workflow

1. Open **Outcomes** and choose an event. **Start tracking** records when coverage starts.
2. Open the event's **Matches** tab and view the relevant pair. Choose **Confirm a meeting** and then **Record meeting** after verifying that both people met through the introduction, in person or remotely.
3. If a confirmation was recorded in error, open the same pair and use **Correct outcome** to remove it from the report.

The timestamp records when the organizer confirmed the meeting. Historical events can be tracked explicitly. Events without tracking have unknown coverage. Tracked events with zero confirmations display zero. The organization total counts confirmations reported by its tracked events. The people count deduplicates event-local canonical identities across the confirmed pairs for that event. It is available per event because identities belong to events. Selection, scheduling, and SMS activity on their own do not enter the report. A later match revocation preserves a confirmed meeting and prevents new confirmations on that match.

## Storage

[Migration 0017](../../drizzle/0017_outcomes_tracking.sql) creates `event_outcomes_tracking`, `event_match_completions`, and `event_match_completion_changes`. Existing events begin without tracking. The current completion and each audit change are bound to the original event and match. A correction clears the completion timestamp and appends a new audit revision. Write transactions lock the actor’s membership and the event before changing the outcome. Reports read coverage and counts from one database snapshot.

## Interface and permissions

Active local Owners and Organizers can read the selected organization’s Outcomes and Overview summaries and manage outcomes for its events. Staff grants, Wefter access, and sponsor roles do not grant reporting access. Reporting reads aggregate data. Simulation mode disables outcome writes. Real confirmations remain readable, and matches persisted by the simulator are excluded from recording by their deterministic recommendation IDs.

- `/outcomes` shows the organization report. `/outcomes?eventId=<eventId>` narrows the same report to an event in the selected organization.
- `GET /api/events/:eventId/matches/:matchId/outcome` returns `{ data: { completion: { trackingStartedAt, completedAt, revision } } }` for an authorized saved match. Timestamps are UTC ISO 8601 or `null`. Revision `0` means that no confirmation or correction has been recorded.
- `PUT` at the same path requires a same-origin JSON body `{ completed, expectedRevision }` and returns the resulting completion. Starting tracking and resending an unchanged confirmation cannot create duplicate results. A stale conflicting write returns `409 CONFLICT`. The UI reloads the outcome before another decision. Both routes send `Cache-Control: private, no-store`.

The migration runs through the [explicit migration workflow](vercel-deployment.md). The integration suite requires the disposable local database described in [verification](../VERIFICATION.md).
