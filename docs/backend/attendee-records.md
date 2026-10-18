# Attendee records and contact corrections

F03 keeps each event guest as a stable participation/source row and stores event-local identity separately in `event_people`. Every `event_guests.person_id` references `event_people(id, event_id)`; the composite foreign key makes cross-event links impossible. A guest retains its UUID, source, import ID, position, and timestamps through identity linking. Canonical links do not increment the guest replacement revision.

## Corrections and contact review

Owner and Organizer replacements accept all attendee detail fields plus a positive `expectedRevision`. The server locks the active local membership, event, and guest in that order, rechecks the role and event organization, and commits only if the revision matches. A stale write returns `409 / CONFLICT` with `error.details.kind = STALE_VERSION` and the latest authorized guest snapshot. The UI retains the draft and requires deliberate review before retrying with the current revision. Operators can read the roster but receive no edit or import controls; Wefters and other unauthorized roles are denied by the service boundary.

Contact candidates require an exact normalized email or phone match inside the same event. Email matching trims and lowercases syntactically valid email values. Phone matching removes visual separators only from syntactically valid 7–15 digit values and preserves an explicit leading plus. No country code is inferred and syntax does not imply reachability. Names are never a matching signal. Explicit linking groups the duplicate guest's existing identity group under the selected canonical guest's person ID; guest detail and import records remain intact.

The roster flags missing or syntactically invalid email and phone. Invalid contact text can be saved so it can be flagged and corrected. It does not produce a candidate. The current repository has no persisted profiles, matches, or meeting results. F03 creates no later-feature tables; therefore no existing related match rows can currently conflict with a link. Future match persistence must add an atomic conflict check and explicit per-match disposition before links can affect those records.

## API

- `PUT /api/events/:eventId/attendees/:guestId`: strict replacement details and `expectedRevision`.
- `GET /api/events/:eventId/attendees/:guestId`: exact-contact candidates for Owner/Organizer review.
- `POST /api/events/:eventId/attendee-links`: explicit `duplicateGuestId` and `canonicalGuestId` link, scoped to one event.

Writes require same-origin requests, bounded JSON, the normal server actor, and an active local Owner/Organizer membership. API responses are private and non-cacheable. No request accepts a user ID or import provenance.

## Migration

`drizzle/0008_attendee_contact_corrections.sql` creates one person row per existing guest, adds revision 1, derives valid syntax-only normalized phone values, adds event-scoped person integrity, and replaces the event/email unique index with lookup indexes. Import duplicate-email skipping remains in the locked append service. The generated migration was reviewed and applied to the explicitly authorized development `weft_console_test` database on 2026-10-18; correction/link and import PostgreSQL regressions passed. Production rollout remains a separately authorized migration/deployment operation.
