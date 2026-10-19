# F02 Event settings and Wefter management

Status: Implementation in progress — code, generated migration, unit coverage and documentation are present; isolated database and signed-in browser acceptance remain pending
Owner: Sheary
Reviewer: Antonio, especially access checks and downstream settings consumers
Created: 2026-10-18
Execution plan: [F02 implementation](../exec-plans/active/2026-10-18-f02-event-settings-wefter-management.md)

## Source and confirmed decisions

Source: F02 in `/Users/antoniopertuz/Downloads/Weft_Console_Implementation_Backlog.md`. The relevant requirements and subsequent user decisions are recorded here so implementation does not depend on the external file remaining available. The older product workflow informs the settings list, but its communication, reminder, operator-task and shift-planning proposals remain outside this change.

Antonio confirmed these decisions in the planning conversation on 2026-10-18:

- Support any number of named Wefters per event, replacing the backlog's exactly-two-slot requirement. No anonymous positions are required.
- Selecting an existing staff member as a Wefter also grants restricted Wefter access to that event.
- Owners and Organizers set each Wefter's availability hours. Wefters cannot edit their availability or schedule. There is no self-service available/unavailable toggle. This supersedes the earlier current-status proposal and the briefly discussed self-service control.
- Use existing Console components and tokens: add an Event Settings tab and extend the existing Staff tab. Separate supplied designs are not a prerequisite.
- Save focused product settings, with no suggested operating values applied automatically.

## Problem and affected roles

The existing Console has event creation, imports and F01 event access controls, but no persisted networking settings or Wefter schedules. Browser-local Kami configuration is not the operational settings store.

Every event remains scoped to its local organization. Owners and Organizers administer settings and Wefters. Wefters may see only their own hours through the restricted event view. Operators, sponsors, attendees, inactive memberships and outsiders gain no administrative permission. Sponsor/VIP attendee classification never creates staff identity or access. PostgreSQL remains authoritative; Clerk membership alone is insufficient.

## Settings and validation

Persist networking windows, stop-new-introductions time, meeting landmarks, a soft maximum planned introductions per guest, and location freshness, dispatch acknowledgment and missed-meeting thresholds in minutes. Landmarks have stable IDs, names and optional directions. This feature does not add proposal-expiry or feedback windows.

Settings have an independent revision, updating actor and timestamp. Do not use `events.updatedAt` as their revision. Valid partial configuration can be saved. Unknown operating values remain null or empty collections, and missing settings are identified individually rather than replaced by suggestions. A missing value is not an approved zero or an unlimited policy.

Use the event's existing timezone for entry/display and UTC instants for persistence and JSON. Validate ordering, event boundaries, overlapping intervals, ambiguous/nonexistent local times and positive whole-number limits. Reuse existing Temporal-based schedule patterns. Wefter schedules may be saved before networking windows are configured; missing networking configuration still blocks downstream assignment eligibility.

## Wefter records and access lifecycle

Extend `event_staff` with availability windows and update metadata, sharing the existing revision with access edits. Existing grants retain their modes and revisions; existing Wefters start with no configured hours. Do not backfill proposed schedules.

Select existing active local staff memberships from the event organization and prevent duplicate Wefters. Invitations remain in the Owner-only Team flow. Assigning a Wefter atomically saves hours and grants Wefter access. Because F01 permits one mode per membership/event, explain that selecting an Operator switches their access to restricted Wefter mode. Removing a Wefter revokes their event access. Changing away from Wefter mode clears availability windows; retain F01's revision tombstones.

Recheck authorization and target membership in write transactions, following F01's membership-before-event locking order. Concurrent access and schedule edits must conflict rather than overwrite each other.

## Interfaces and screens

| Interface | Behavior |
| --- | --- |
| `GET /api/events/:eventId/settings` | Settings, revision and missing-configuration information |
| `PUT /api/events/:eventId/settings` | Replace settings with `expectedRevision` |
| `GET /api/events/:eventId/wefters` | Wefters, schedules, eligibility and eligible staff candidates |
| `PUT /api/events/:eventId/wefters/:membershipId` | Atomically assign Wefter access and save availability windows with `expectedRevision` |
| Existing event-access update | Remove Wefter access or change mode with existing revision semantics |

These administrative endpoints require an authenticated local Owner or Organizer in the event organization. Use thin route adapters, strict request/response validation, identifier validation, origin checks on mutations, bounded JSON reads, private no-store responses and existing sanitized errors. Resolve the actor server-side.

Use F01's `409 / STALE_VERSION` contract with the latest authorized snapshot. Preserve drafts and require deliberate review before retrying; never force-save or automatically merge.

Add the Settings tab and Wefter schedule controls in Staff. Provide explicit Save actions, saved timestamps, field errors, missing-setting notices, loading/empty/error states and conflict review. Refresh on focus/reconnect without replacing dirty drafts. Cache keys and lifetime retain actor/session/organization scoping.

The restricted Wefter page may show only that person's saved hours, read-only, through a separate allowlisted projection. Do not expose administrative DTOs, other Wefters' schedules or the roster. No Wefter schedule mutation endpoint or toggle is authorized.

## Downstream compatibility and F12 boundary

Publish server-side reads for F08/F09/F11/F12 without implementing their workflows. F09 consumes networking windows, landmarks and location freshness; planning consumers use relevant limits; F12 consumes named, authorized Wefters and their schedules.

A Wefter can receive new assignments only while identity, membership and Wefter grant remain valid, the time is within saved hours and an approved networking window, required configuration is present, and F12 booking checks pass. No saved hours means unconfigured availability. Availability does not prove an introduction finished and does not automatically cancel existing work.

F12 must handle active introductions before schedule/access changes invalidate their Wefter, including edits through F01 access controls. Its implementation must integrate that protection with the mutation transactions, not only hide UI controls. Record this as mandatory F12 integration acceptance. No assignment storage exists today: do not create placeholder tables or no-op safety hooks, or claim actual active-introduction protection passed during F02.

## Acceptance and exclusions

Verify settings save/reload across sessions/devices, valid partial configuration, missing-setting diagnostics, invalid/timezone-sensitive windows, zero/one/more-than-two Wefters, assignment/removal, Operator conversion, schedule boundaries, concurrent edits, role/tenant denials and own-schedule redaction. Verify desktop/narrow layout, keyboard/focus, error/conflict recovery, dirty drafts and account switching. The execution plan records commands and actual evidence.

No UI redesign, communications administration, reminders, operator tasks, backups, shift planning, booking/assignment implementation, new dependencies, deployment or production changes are included. Recording availability intervals is included; a broader staffing scheduler is not. No unresolved product decisions remain; routine code structure follows existing Events patterns. Implementation must preserve the uncommitted F01 foundation and its pending acceptance status.
