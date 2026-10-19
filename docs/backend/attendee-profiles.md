# Attendee profiles and information completeness

## Data model

`event_guest_profile_versions` is an append-only history of the matching information for one guest. Rows are only inserted by the application: a save never updates or deletes an earlier row, so `(guest_id, version)` stays a stable reference for matching (F06/F07) and introductions (F08). The database does not block updates or deletes of these rows; immutability is an application rule.

Each row holds eight optional free-text fields: `summary` (the shareable intro, up to 500 characters) and `goals`, `offers`, `desired_connections`, `avoid`, `background`, `linkedin_details`, `missing_details` (up to 2000 characters each). A field is `null` or non-blank trimmed text. An empty field means unknown and is stored as `null`, never as `""`. Check constraints enforce this.

`organizer_only_fields` lists the matching fields that are `ORGANIZER_ONLY`. It can only contain the seven matching keys (`goals`, `offers`, `desiredConnections`, `avoid`, `background`, `linkedinDetails`, `missingDetails`); `summary` is shareable by definition. Keys are camelCase, as in the API.

`event_guests.profile_version` points at the current row. `0` means no profile has been saved, and no version row exists. Existing guests migrate to `0`. The current profile is the row where `version = event_guests.profile_version`. Versions are bound to the guest's event by a composite foreign key on `event_guests(id, event_id)`.

Every save also writes an `event_matching_changes` row of kind `profile_updated` with `guest_ids = [guestId]`, in the same transaction. F07 consumes these rows; see [networking participation](networking-participation.md).

## Completeness

`src/modules/attendees/profile-completeness.ts` is the single place that decides what is available or missing, shared with F06/F07.

| Key | Available when |
|---|---|
| `goals`, `offers`, `desiredConnections`, `background` | the field has text |
| `linkedin` | `linkedin_details` has text (`available`); otherwise `url_only` if the imported LinkedIn URL is on file; otherwise `missing` |

`url_only` never means the LinkedIn profile was read. Completeness is informational: nothing gates matching, and there is no ready or approve state. `avoid` and `missing_details` are not tracked as completeness; they are restrictions and notes.

`shareableSummary(profile)` returns `summary` plus the non-empty matching fields that are not organizer-only. Organizer-only fields are never in the shareable summary, but they are still stored in the profile version that matching reads.

## API and permissions

| Method and path | Body | Result |
|---|---|---|
| `GET /api/events/{eventId}/guests/{guestId}/profile` | none | 200 `{ profile, completeness, summary }`; version 0 and all-null fields when nothing is saved |
| `PUT /api/events/{eventId}/guests/{guestId}/profile` | `{ fields, organizerOnly, expectedVersion }` | 200 `{ profile, completeness, summary }` for the new version; 200 no-op with no new version and no log row when the content is unchanged; 409 `CONFLICT` with `data.profile` holding the latest saved version when `expectedVersion` is stale; 422 invalid body |

`fields` must contain all eight keys (use `null` or `""` for unknown). A first save sends `expectedVersion: 0`. An unchanged save is a no-op even when the version is stale, as in networking changes. Saving an all-empty profile for a guest with no profile does not create version 1.

Only active owners and organizers can read or save profiles. Event staff, sponsors and inactive members receive 403. The permission is checked before the request is accepted and again under the membership row lock, using the shared lock order (membership, event, then guest row). Malformed IDs return 400, wrong origin 403 (checked on `PUT`), wrong media type 415 and invalid bodies 422. Responses carry `Cache-Control: private, no-store`.

The GET response includes organizer-only text, because owners and organizers edit it. Only `summary` in the response is filtered.

## Reading

Event Detail returns `profile { version, completeness }` on every guest, built from presence flags only, so the roster payload does not carry profile text. Full text loads from the `GET` route when the profile panel opens.

## Console

The attendee roster has a **Profile** column (Goals, Background and LinkedIn chips), a "missing goals / background / LinkedIn details" filter, and a **Profile** row action that opens `ProfilePanel`. The panel edits all fields, toggles organizer-only per field, previews the shareable summary and completeness live, and on a 409 shows the latest saved version with the choice to load it or keep the draft on top of it.

## Boundaries

Not built here: matching, version history browsing, automatic profile extraction, and duplicate merge (F03). Open items:

- F06 needs to confirm the profile and completeness format it reads.
- F07 reads the current version at run time (each automatic run takes a fresh Console snapshot). F07/F08 must pin accepted or active introductions to the version they were created with.
- A duplicate merge (F03) should keep the newest profile version on the main record and keep the other record's versions linked.

## Rollout

Migration `drizzle/0010_profile_versions.sql` is additive; it adds the `profile_updated` enum value, the version table and `event_guests.profile_version` (default 0). Follow the shared-database rules in [Attendee CSV imports](attendee-imports.md) before applying it. The database tests in `tests/profile-database.test.mjs` run only with `WEFT_DATABASE_TEST=1`.
