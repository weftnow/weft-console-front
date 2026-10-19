# F08 Automatic match creation and match list

Status: Ready — decisions settled with the user on 2026-10-19; implementation in progress
Plan: [F08 active plan](../exec-plans/active/2026-10-19-f08-automatic-matches.md)

## Problem

The matching engine selects pairs and publishes them through a pull feed of `issued` and `revoked` recommendations ([F07](../exec-plans/active/2026-10-19-f07-automatic-matching-updates.md)). The Console stores none of them, so organizers cannot see which pairs were selected. F08 saves valid selected pairs as Console matches automatically and shows them in a match list and detail. There is no approval queue.

## Requirements

- A valid `issued` feed entry becomes one Console match. A pair is one row per event: A+B and B+A are the same match, enforced in PostgreSQL.
- A match is **an automatic selection only**. It is not guest acceptance (F10), a meeting (F11), a Wefter assignment (F12) or a cancellation (F13). No Console copy may imply that a guest agreed, was contacted or will meet.
- Before saving, the Console re-checks the entry against its own data: both guests belong to the event, both are included in matching, the pair is not blocked, and the two guests are not one linked person. An entry that fails is stored as `revoked` with a plain-language reason; it is never silently dropped.
- A `revoked` feed entry marks the stored match revoked with the engine's reason. Revoked matches stay in the list with their status and reason. A replayed `issued` entry never reactivates a revoked match.
- The introduction path (`sms_coordination` or `wefter`) is derived once, when the match is created, and stored: any pair containing a VIP or Sponsor guest uses a Wefter; a pair of two regular Attendees uses message coordination outside the Console. Later guest-type corrections do not change a saved match.
- Sync is **pull on read plus the status poll**, with one feed cursor per event and idempotent writes. There is no cron and no Console-to-engine push.
- Access: active Owners and Organizers of the event's organization only. Operators, Wefters, sponsors, attendees, inactive members, outsiders and other tenants are denied at the service boundary.
- Event Detail has a **Matches** tab (visible to users who can manage attendees). Each match opens in a dialog with both profiles, the reasons for each guest, uncertainty, missing information, restrictions, earlier introductions in the event, the source run, the pinned profile versions and, if revoked, the reason.
- When the engine cannot be reached, stored matches are still shown with a note that the list may be out of date.

## Decisions

- **Pinned profile versions** are stored for display and audit. An older pinned version does not invalidate a match: the engine keeps recommendations when a profile is edited. A pinned version newer than the Console's current version is rejected as an invalid feed.
- **Local revocation reasons reuse the engine's four reasons**: `guest_excluded`, `pair_blocked`, `identity_resolution_required`, `guest_missing`.
- **Unknown guests** cannot be stored (the guest foreign key needs a row). Such entries are counted as skipped and the cursor advances.

## Out of scope

Acceptance statuses (F10), meeting plans (F11), Wefter assignment (F12), cancel/replace (F13), manual pair creation or approval, messaging, engine changes, a Console lifecycle reader for the engine, availability-driven matching, cron-based sync.

## Affected roles and organizations

Every read and write is scoped by the event's organization. Owners and Organizers read; nobody writes matches through the API (matches are created only by feed sync). Denied: operator, Wefter, sponsor, attendee, inactive, outsider, cross-tenant, unauthenticated.

## Acceptance scenarios

1. A finished run issues two pairs; opening the Matches tab lists both with their introduction path and no acceptance wording.
2. Replaying the same feed page changes nothing; the same pair arriving as B+A adds no second row.
3. A guest is excluded after the engine issued a pair; the next sync shows the match revoked with "guest excluded".
4. An issued entry for a blocked or excluded pair is stored revoked with its reason.
5. The engine is down; the list still shows stored matches and says it may be out of date.
6. An operator, Wefter, sponsor or another organization's Owner receives 403/404 and no engine request is made.
7. Detail shows both profiles, reasons, uncertainty, missing information, restrictions, earlier introductions, source run and pinned versions.
