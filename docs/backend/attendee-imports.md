# Attendee CSV imports

## Data model

An `event_guests` row is an attendee's event-specific participation and contact snapshot. It is not a Console login or a globally matched person. Event ownership is reached through `event_guests.event_id → events.organization_id`; guests are never copied into `users`.

`event_attendee_imports` stores immutable successful batches. Each batch has a UUID, event, server-derived `imported_by`, display filename, versioned SHA-256 content fingerprint and counts. A CSV guest links to its batch through `(import_id, event_id)`; manually entered Create Event guests keep `import_id = NULL`. The API DTO returns saved guest UUIDs and timestamps, but never returns the fingerprint, actor ID or CSV contents.

## API and permissions

`POST /api/events/{eventId}/attendee-imports` accepts JSON with only `fileName` and `csvText`. The route requires the normal server-side actor, a same-origin request, JSON content type and a body no larger than 3 MiB. The CSV is limited to 1 MiB and 2,000 candidate rows. The existing authentication adapter is unconfigured, so normal requests currently fail closed with 401. Do not add a request-supplied identity or a test impersonation path.

Only an active owner or organizer membership in the event's organization can import or read the full roster. Membership is rechecked under a row lock before event roster state or replay results are used. Staff and sponsors do not receive import access.

The response is 201 for a new committed batch and 200 for an exact content replay. Errors use the shared envelope: 400 malformed JSON or event UUID, 401 missing actor, 403 origin or permission failure, 404 missing event, 413 oversized request, 415 wrong media type, 422 invalid CSV or capacity, and 500 sanitized unexpected failure.

## Append, duplicate and replay behavior

The importer uses the Create Event CSV aliases, template, validation and LinkedIn normalization. It rejects duplicate/ambiguous headers, rows without a name, duplicate normalized emails inside one file, invalid field values and files over the limits. Unknown columns are ignored. Row feedback uses logical record numbers and omits raw contact values.

Imports append new records. A normalized email already on this event's roster increments `duplicateCount` and is skipped without changing the existing guest's contact details, type, source or provenance. Emails on other events do not affect this roster. Guests without email remain distinct records.

The server fingerprints the normalized guest tuples in input order. Reposting the same guest content to the same event returns the original batch without another write, even for no-email guests. Filename, header spelling, BOM and newline encoding do not affect this fingerprint. Reordered or changed no-email rows are different content and may append again; the fingerprint is a retry safeguard, not a global identity match. Email is an event-local deduplication key only.

The 2,000-person bound is the total roster size, including existing guests. The transaction checks capacity while holding the event lock. It either writes one batch and all new guests, or writes nothing. If every candidate email already exists, it still records a successful zero-addition batch. Replays are checked before capacity so an exact retry succeeds even when the roster is full.

## Transaction and history

The repository locks the actor's organization membership before locking the event. It then reads count, maximum roster position, candidate emails and matching fingerprints under the event lock. One transaction inserts the batch, inserts guests with the next positions, and updates the event timestamp. A failed guest insert rolls back the batch and timestamp. The unique event/email, event/position and event/fingerprint constraints provide final consistency checks.

Event Detail returns persisted guest IDs and the latest 20 imports, newest first with UUID tie-breaking, along with the total batch count. The roster metrics count saved guest rows. The UI refreshes the server-backed detail route after a successful save and keeps local attendee-tab, search and filter state.

## Migration and rollout

The migration is `drizzle/0001_attendee_import_batches.sql`; `0000_create_event_backend.sql` and its metadata are preserved. The migration first raises an exception if it finds duplicate event positions, CSV guests without legacy imports, inconsistent stored/guest or guest-type counts, invalid normalized emails, invalid filenames, or out-of-range import counts. Resolve and inspect any such data before retrying; the migration does not merge or discard guests.

Legacy import rows receive one UUID, `imported_by` from `events.creator_id`, `duplicate_count` inferred as `imported_count - stored_count`, `blank_count = 0` because the old schema did not store it, and a null fingerprint because the original CSV is unavailable. Existing CSV guest UUIDs and contact fields are retained and linked to that row. Guest timestamps are inferred from `events.created_at`. The old import timestamp and counts are retained.

Inspect the database and Drizzle migration journal read-only first. Local development and automated tests share `weft_console_test` on the Neon `dev` branch. Use its pooled connection for local `DATABASE_URL` and its direct connection for `DATABASE_MIGRATION_URL` and `DATABASE_TEST_URL`, with `WEFT_MIGRATION_TARGET=development`. Load `.env.local` explicitly for standalone commands as described in [Create Event setup](create-event.md). Run live tests with `WEFT_DATABASE_TEST=1` only while local/preview app usage is stopped; the shared data is disposable. Destructive migration bootstrap/upgrade checks must use a temporary scratch database or isolated schema instead of resetting this shared database. Production uses `weft_console` on the `production` branch and receives reviewed migrations through the authorized release process; never target it from local tests.

The old application expects one import row per event and cannot write batch history. Deploy the schema and new application in a controlled window without concurrent old/new application writers. Once new batches exist, rollback requires a forward fix; do not drop batch or provenance columns.

## Boundaries

The app's own organization/event identity model remains separate from the `weft` database used by another service. A future global People directory needs explicit identity, consent and cross-event matching rules. A `Sponsor` guest remains an attendee category and does not provision sponsor membership or a sponsor company.

Authentication integration, edits/deletes/manual additions after event creation, roster replacement, lifecycle close rules, raw file retention, asynchronous large imports and server pagination beyond the 2,000-row pilot bound remain separate work.
