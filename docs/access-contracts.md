# Shared access and data contracts

This reference describes the F01 foundation implemented in the Console. Local PostgreSQL membership and event grants determine access. Clerk proves the session and identity only.

## Roles and event scope

| Local role / event mode | Event scope | F01 operations |
| --- | --- | --- |
| Owner | Every event in the active organization | Create/import, Team invitations, event grants |
| Organizer | Every event in the active organization | Create/import, event grants; no Team invitations |
| Staff + `operator` grant | Explicitly granted events | Event detail, covers, roster reads |
| Staff + `wefter` grant | Explicitly granted events | Minimal event context; assignment screen/storage is F12 |
| Staff without grant, sponsor, inactive membership, disabled identity, outsider | None | Denied |

An event grant is one `event_staff` row keyed by event and local membership, with nullable `console_access` (`operator` or `wefter`) and positive `revision`. F02 adds `availability_windows`, update actor, and timestamp to that row; schedules share the grant revision. Existing Wefters start with no configured hours. Existing staffing rows migrate with null access; event staffing does not itself grant Console access. Revocation sets access to null, clears Wefter hours, and increments revision. A staff invitation admits the local `staff` role but grants no event.

Owners and Organizers retain organization-wide event access. Both manage event grants. Team invitations and actions remain Owner-only. Staff cannot create events, import attendees, administer grants, or access Team. Sponsor/VIP classification on a guest never creates Console identity or access.

## Identity and identifiers

`organizationId` is the local organization UUID; `eventId` is `events.id`; `guestId` is `event_guests.id`; `membershipId` is `organization_memberships.id`; `userId` is the authenticated local `users.id`. Event staff selections and `event.staff[].id` refer to membership IDs. Provider subject IDs and guest IDs are never interchangeable with local user IDs. JSON timestamps are UTC ISO 8601 instants; unknown optional values remain explicitly nullable.

Network's `canonicalizePair(guestAId, guestBId)` lowercases valid UUIDs, orders them as `guestLowId` and `guestHighId`, and rejects self-pairs. F08 owns persisted pair rows (`event_matches`, [automatic matches](backend/matches.md)) and enforces uniqueness on `(eventId, guestLowId, guestHighId)`, event-scoped guest references, and ordered IDs in PostgreSQL. F01 creates no pair table. Match reads are limited to active Owners and Organizers of the event's organization.

## Event access API and revisions

- `GET /api/events/:eventId/access` returns active local staff candidates, their access mode, and revision. It is Owner/Organizer-only.
- `PUT /api/events/:eventId/access/:membershipId` accepts exactly `{ accessMode: "operator" | "wefter" | null, expectedRevision: number }`. Revision `0` is used only when no event staff row exists. The response is `{ data: { eventAccess } }`.
- A successful replacement increments the revision. Revocation is a retained null-mode row. A stale revision returns HTTP 409 / `CONFLICT` with `error.details.kind = "STALE_VERSION"` and the latest authorized `current` DTO. Inaccessible snapshots are never returned.
- Clients keep the draft after conflict, show the latest saved mode and revision, and require deliberate review before retrying with the new revision. No automatic merge or force-save exists.

Membership rows are locked in stable order before event and grant rows. Event imports remain append-only, lock membership then event, and keep their fingerprint replay, duplicate and capacity semantics; event `updatedAt` is not a replacement-edit revision.

Wefter event context is a strict allowlist of `eventId`, `name`, `venue`, and `accessMode`. Its own-hours projection contains only that event's identity, timezone, and the requesting Wefter's availability intervals. Both exclude roster, contact details, import history, other Wefters and private notes. Owners/Organizers alone can assign Wefters and write schedules. Settings and schedule JSON timestamps are UTC ISO 8601 instants; local entry and display use the event timezone. Unconfigured values stay null or empty and are reported as missing, never filled with suggestions.

`GET /api/events/:eventId/settings` and `PUT` are Owner/Organizer-only. Settings use an independent revision and strict DTO. `GET /api/events/:eventId/wefters` returns the local staff candidates and Wefter roster only to administrators. `PUT /api/events/:eventId/wefters/:membershipId` atomically assigns restricted Wefter access and replaces hours using the shared `event_staff` revision; setting `assigned: false` revokes access and clears hours. F01's access update also clears hours whenever the mode changes away from Wefter. Stale writes return `409 / STALE_VERSION`; clients preserve drafts for deliberate review. Wefters have no schedule mutation or availability toggle.

F12 must protect active introductions before any schedule or access change invalidates a Wefter, including changes through F01's access API. That protection must join the mutation transaction when F12 assignment persistence exists. F02 adds no placeholder assignment table or no-op hook and does not claim active-introduction protection. F12 must define and verify its own saved-assignment projection and owner isolation. F08 owns concurrent persisted pair uniqueness. Those consumer checks are later-feature acceptance and are not claimed by F02.

## Organization selection and caches

Multiple eligible organizations require an explicit selection. Selection cookies are actor-bound and never grant authority. Invalid or stale cookies lead to the chooser; they do not silently select a different tenant. Cookie writes/deletes happen in authenticated Server Actions. Staff with event grants enter from the grant list using the event-specific operator or Wefter route.

The Event Detail query cache remains scoped by local actor, Clerk session and organization and is cleared on scope changes or sign-out. Server authorization is rechecked for each request; cached UI is not permission evidence.

## Consumer requirements

F02 uses the grant API for Wefter setup and availability, and uses expected revisions for mutable settings without changing event access semantics. F03 keeps canonical person/duplicate identity separate from original guest/import IDs and applies revisions to guest replacements, not to its identity links. F05 and other replacement editors use expected revisions and sanitized current snapshots. Append-only imports keep their locked append/replay contract; profile-content revisions and matching-approval versions retain their own meaning. F08 adds persisted pair uniqueness. F12 proves actual own-assignment read/update isolation and reviews every assignment DTO field before exposing it to Wefters.

F03 attendee detail replacement and exact-contact candidate/link operations are Owner/Organizer-only and recheck local membership while locking membership before event and guest rows. Operators retain read-only roster details. Canonical identities and guest links are constrained to one event; guest revisions increment only for detail replacement, while identity links preserve them.
