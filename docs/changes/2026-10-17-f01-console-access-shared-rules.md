# F01 Console access and shared data rules

Status: Implemented — F01 foundation in the working tree; PostgreSQL transaction and staff invitation integration passed on the development test database; signed-in browser acceptance remains pending
Owner: Antonio
Reviewer: Sheary, especially contracts consumed by F02–F15
Created: 2026-10-17
Execution plan: [F01 implementation](../exec-plans/active/2026-10-17-f01-console-access-shared-rules.md)

## Source and problem

Source: `Weft_Console_Implementation_Backlog.md`, supplied from `/Users/antoniopertuz/Downloads/Weft_Console_Implementation_Backlog.md`, F01 and its downstream dependencies. This document records the relevant requirements so implementation does not depend on that external file remaining available. The source says the UI designs are complete, but no design files were supplied with this request.

F01 extends existing login/event access, establishes shared IDs and API conventions, and prevents conflicting edits from overwriting newer saved values. Each later feature owns the tables and endpoints it actually needs. Current code has organization authorization, event/guest UUIDs, and serialized append-only CSV imports; it has no operational staff access, Wefter assignment persistence, pair persistence, or general edit-version contract.

## Requirements and confirmed decisions

- Server checks restrict Console users to allowed events and Wefters to their assignments and necessary information.
- An attendee's Sponsor/VIP classification never creates a user, membership, or roster permission.
- All features use the same event and guest IDs. A+B and B+A identify one event pair.
- A stale edit cannot replace a newer saved value. The client shows the latest authorized saved data after a conflict.
- **Confirmed by Antonio in this planning session, 2026-10-17:** Owners and Organizers retain access to all events in their own organization; staff and Wefters require event-specific grants. No per-event Organizer grant is required.
- **Confirmed by Antonio:** Owners and Organizers can grant/revoke event access; Team invitations remain Owner-only. Staff operators get event/roster reads only in F01. Wefter assignment storage and screens remain in F12; F01 delivers restricted entry and access/data contracts.
- Existing identity mapping, organization isolation, import provenance/replay/capacity behavior, and Owner-only Team administration remain requirements.

The contracts below implement the finalized plan. They describe intended F01 behavior, not the current deployed baseline. Technical defaults are settled for implementation; Sheary remains the consumer contract reviewer, and no completed review by her is claimed.

## Access model

Reuse local roles `owner | organizer | staff | sponsor`; represent a Wefter as local `staff` with event access mode `wefter`. Avoid a provider role or organization-wide Wefter role. A staff member can be an operator at one event and a Wefter at another. One staff membership has one access mode per event; simultaneous operator/Wefter access is outside F01.

| Actor in the event's organization | Event discovery and data | Writes in F01 |
| --- | --- | --- |
| Active Owner | All organization events and existing organizer data | Existing event creation/imports; Team administration; event access management |
| Active Organizer | All organization events and existing organizer data | Existing event creation/imports; event access management; no Team administration |
| Active staff + event mode `operator` | Granted events; organizer event detail/roster | No new product writes; later feature specs grant operations explicitly |
| Active staff + event mode `wefter` | Granted events' minimal event context; own assignment projection when F12 exists | No roster/import/settings/Team writes; F12 defines own-assignment result operations |
| Staff without an event grant; inactive membership; disabled identity; outsider | No protected event data | Denied |
| Sponsor membership, or attendee classified Sponsor/VIP without another qualifying membership | No operational event/roster access | Denied; no new sponsor dashboard |

Owner/Organizer authority comes from local membership, regardless of event staffing. If someone has that authority, an additional Wefter label does not reduce their organization permissions; a person requiring assignment-only access must use a staff membership. There is no global Weft-staff bypass: staff must have a local membership in each customer organization they serve.

Owners and Organizers manage event access within their organization. Only Owners manage Team invitations. Staff operators have no import, access-administration or other product writes in F01; later features grant operations explicitly.

### Persistence and admission

Extend existing `event_staff` with nullable `console_access` (`operator | wefter`) and positive integer `revision` (initially 1). Its existing event/organization and membership/organization composite foreign keys preserve tenant boundaries. Existing rows migrate to `console_access = null`: prior staff selection is not evidence of an authorized Console grant. New Create Event staff selections also remain ungranted until an Owner or Organizer deliberately grants access.

An active grant requires an active local `staff` membership in the event organization plus a non-null mode. Revocation retains the row, sets mode to null, and increments revision; do not delete/recreate rows and reset versions. Owner/Organizer access does not depend on this column. F02's two named Wefter slots and availability are separate operational configuration referencing the membership, not substitutes for access grants.

Extend existing Owner-managed Team invitations to admit local `staff`, updating validation, database role check, UI role choices, and completion tests together. Use existing verified-provider evidence and local admission; no new Clerk organization settings or account linking by email. Admission alone grants no event. Existing memberships keep their current roles under existing admission rules; a conflicting role requires deliberate resolution, not automatic promotion/demotion.

The F01 access API lets Owners and Organizers list active staff candidates and grant/revoke event access after admission. Put these controls in the existing Event Detail **Staff** tab, including current modes, revisions and the conflict flow. F01 also adds the necessary Team role choice, organization selection, restricted navigation, and Wefter entry/empty state. F02 builds its settings/two-slot/availability screen against the same contracts.

### Enforcement and response boundaries

Place event policy and scoped access reads/writes in `src/modules/events/`; organization admission remains in `src/modules/organizations/`. Resolve the actor through the existing server session and enabled local identity. Check membership, event organization, mode, and operation at the service/repository boundary. Never use a posted actor, provider organization role, selected-organization cookie, or a hidden UI control as authority.

Apply the policy to event discovery, detail, covers, imports, new access endpoints, and future product operations. Staff operator reads require a restricted event list query; they do not get the organization-wide list. Existing creation/import writes remain Owner/Organizer-only. Prevent cross-event guest/resource references even when both IDs are valid UUIDs. Recheck authorization in mutation transactions; lock relevant membership rows in stable order before event/grant rows, compatible with the import's membership-then-event locking.

Keep the full `EventDetailDto` and its endpoint unavailable to Wefters. Introduce a separate allowlisted Wefter context DTO containing event ID/name/venue and access mode. The future own-assignment DTO may contain pair/assignment IDs, both guests' names, approved shareable summaries/reason, current meeting place/location timestamps, and operational status. Contact information, private profile/restriction notes, import history, feedback, and unrelated guests/assignments are excluded by default. F12 must review the exact field list before exposing saved assignment data.

F01 supplies the assignment ownership policy and DTO validation with fixtures, plus a real restricted entry page with an honest empty state. F12 supplies assignment persistence, scoped queries and operational screens. No fabricated assignment endpoint/table or UI result counts as completed assignment acceptance.

## Shared contracts

### IDs and ownership

| Identifier/value | Contract |
| --- | --- |
| `organizationId` | Existing local organization UUID; derive/verify through the requested event |
| `eventId` | Existing `events.id`; stable across reads, imports and later features |
| `guestId` | Existing `event_guests.id`; UI `guest.id` is this same UUID |
| `membershipId` | Existing `organization_memberships.id`; `event.staff[].id` and selected staff IDs refer to memberships, not user IDs |
| `userId` | Existing local `users.id`, used for authenticated actors/provenance; never a guest ID or provider subject |
| Timestamps | UTC ISO 8601 instants in JSON; retain the existing separate event date/time/timezone fields |
| Missing/unknown data | Explicit nullable/unknown states in owning schemas; absence is never implicit approval, acceptance, attendance or completion |

Keep existing JSON field names and Zod validation. If a shared UUID normalizer is extracted from Events, put only genuinely shared identifier validation in `src/shared/lib/`; keep feature schemas with their owners. Normalize UUID text consistently before pair ordering. No identity inference from name, email, phone, roster position, or provider IDs. F03 owns canonical-person/duplicate links and preservation of original import identity.

Network owns a small pure `canonicalizePair(guestAId, guestBId)` contract returning ordered `guestLowId, guestHighId`, rejecting self-pairs. Pair identity is `(eventId, guestLowId, guestHighId)`. F08 must enforce the ordering, event-scoped guest references, and a database unique constraint on this tuple; application normalization alone cannot prevent concurrent duplicates. F06/F07 use the same ordering for result validation/deduplication. Attempts and replacement links belong to later feature tables. F01 creates no match/attempt table. F03 must reconcile pair collisions explicitly if duplicate-person resolution later maps two IDs to one person.

### Access endpoints and concurrency

Thin adapters, with service contracts consumed by F02:

- `GET /api/events/:eventId/access`: Owner/Organizer-only candidate/membership/access-mode list; include revisions. This is distinct from the existing staff presentation list.
- `PUT /api/events/:eventId/access/:membershipId`: Owner/Organizer-only strict input `{ accessMode: "operator" | "wefter" | null, expectedRevision: number }`. Revision 0 means no existing row, used for an atomic first insert; an existing staffing row always has revision >=1. Response is `{ data: { eventAccess } }` with the saved mode, IDs and revision.
- Use the same service for any Server Action/F02 caller. Keep existing same-origin, bounded-body, UUID, sanitized-error and `private, no-store` conventions. Tenant/user identity and permissions are server-derived.

All replacement edits introduced in F01 require an expected revision, with no unconditional-save path. Transactionally authorize, compare the expected revision, update and increment; a failed comparison performs no write. Concurrent initial inserts are also conflicts. A repeated request after a successful save may conflict and must never silently reset state.

Use existing HTTP 409 / `CONFLICT`, adding a validated, operation-specific `error.details` object such as `{ kind: "STALE_VERSION", current: <authorized event-access DTO> }`. Preserve existing `error.code/message/fields` clients. Do not put arbitrary database rows in shared errors. Recheck read authority before returning current data; revoked/foreign access receives 403/404 without a snapshot. Missing/deleted resources receive the normal inaccessible/not-found outcome, not a stale row.

The client retains the unsaved draft, shows the latest saved values/revision alongside it, explains that saving was blocked, and requires a deliberate reload or revised submission using the new revision. No automatic merge/retry or “force save.” A second intervening edit conflicts again. Deliver this behavior for access editing and a reusable presentation only where genuinely shared; F02/F03/F05 adopt the contract in their actual editors.

Append-only CSV import is not a replacement edit. Preserve its locked append, fingerprint replay, duplicate-email and capacity semantics; do not require a roster version that breaks safe concurrent imports. Existing `updatedAt` is freshness metadata, not an optimistic-lock token. Later features add revisions to their mutable aggregates when creating those records; profile-content versions and matching approval versions have their own semantics.

## Organization selection and cache compatibility

Repair the existing resolver/selector gap as part of access entry. Multiple eligible organizations require an explicit local selection; invalid/stale selections never fall back to another tenant. Include organizations with effective staff event grants and show only the selected organization's allowed events. No eligible access produces the neutral access-required state. Preserve an intentional safe switch action and actor-bound cookie.

Read cookies during Server Component rendering; set/delete them only in an authenticated Server Action or Route Handler, as required by the installed Next.js guide. Check every data/action boundary independently of layouts. The existing page-context helper's render-time cookie deletions need correction.

Preserve query scoping by local actor, Clerk session and selected organization. Separate organizer/operator data keys from Wefter projections, clear cached protected data on session/organization/access-mode changes and denied responses, and refetch on navigation/focus. Staff cannot seed a Wefter cache from a full roster response. Revocation blocks the next server request; F01 makes no claim to erase data already displayed on a disconnected device.

## Acceptance scenarios

1. Owners and Organizers see all events in their organization, retain existing creation/import behavior, and can administer event grants. An Organizer cannot administer Team invitations.
2. A staff operator sees only explicitly granted events; direct URL/API/cover access to another event or organization fails. Revoked/inactive memberships and disabled identities fail on the next protected operation.
3. A Wefter gets only minimal event context and the restricted entry screen; full event detail, roster, import, Team and unrelated assignment access are denied. Assignment policy/projection tests include own, other-Wefter, wrong-event and wrong-organization fixtures.
4. Sponsor/VIP guest import or later classification changes create no identity/membership/grant. A sponsor membership does not acquire staff privileges.
5. Staff invitation acceptance preserves exact verified admission evidence and replay safety but yields no event access before an explicit grant. Foreign/inactive/sponsor targets cannot receive a staff event grant.
6. Two clients save the same access revision: one succeeds, one receives 409 and current authorized values; the first save remains persisted. Cover grant/revoke and simultaneous first-insert races, missing versions, and revoked-actor snapshot denial.
7. UUIDs round-trip unchanged across existing reads/imports. Pair normalization treats A+B and B+A identically and rejects self-pairs. No future table is claimed to exist.
8. Organization selection, sign-out/account changes, stale cookies, direct mutations and cache transitions cannot expose another tenant or a broader access mode.
9. **Consumer acceptance owned by F08/F12:** F12 uses actual saved assignments to prove a Wefter can read/update only permitted own assignments and receives only approved fields. F08 proves persisted pair uniqueness under concurrency. Record these obligations at the F01 handoff; they do not block completion of the F01 foundation, and F01 tests do not certify either future database behavior.

## Compatibility, non-goals and handoff

No UI redesign, generic permission/workflow engine, operator task system, communication log, sponsor dashboard, matching backend, booking/assignment workflow, attendee editing, duplicate merge, or future-feature database scaffolding. Existing event dates and times remain as implemented; the backlog does not require changing them. No new dependency is expected.

Implement the finalized contracts above without reopening the confirmed access/scope choices. Share the ID, grant, revision/error and restricted-projection contracts with Sheary for dependent features; do not send messages or claim her review without evidence. F01 foundation completion requires its own observable acceptance and verification, with F08/F12 consumer obligations explicitly recorded. This specification becomes Complete only after that foundation passes; do not describe future-feature acceptance as verified.
