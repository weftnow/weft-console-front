# Implement F01 Console access and shared data rules

Status: Active — F01 implementation complete; signed-in browser acceptance and one transaction race case remain
Owner: Antonio
Contract reviewer: Sheary
Created: 2026-10-17
Specification: [F01 behavior and shared contracts](../../changes/2026-10-17-f01-console-access-shared-rules.md)

## Goal and acceptance criteria

Implement backlog F01 on the existing Next.js Console: server-enforced event access for Console staff/Wefters, shared event/guest/pair contracts, and visible edit conflicts. Preserve the existing Clerk-to-local-user mapping and PostgreSQL role authority. The current request authorizes application code, generated migrations, tests, UI, and canonical documentation. On 2026-10-18, Antonio explicitly authorized applying the two additive F01 migrations and running cleanup-backed PostgreSQL fixtures on the existing development `weft_console_test` database. Do not touch production, send invitations, deploy, or alter unrelated customer records.

Affected tenants: every organization using Console events, including staff serving more than one customer. Affected roles: Owner, Organizer, staff acting as event operator/Wefter, and denied sponsor/attendee/outsider paths. Antonio confirmed the following decisions on 2026-10-17; the linked Ready specification settles the implementation contracts.

| Role | Event access | Administration |
| --- | --- | --- |
| Owner | All organization events | Team invitations and event grants |
| Organizer | All organization events | Event grants; no Team invitations |
| Staff operator | Granted events and roster reads only | None |
| Wefter | Granted events' minimal context; own assignments when F12 exists | None |

Use local staff membership plus one event-specific operator/Wefter mode, without a new provider role. Existing staffing rows gain no access automatically. Place grant/revoke and conflict controls in Event Detail's existing Staff tab. F01 delivers the Wefter foundation; F12 delivers actual assignment storage/screens.

- [ ] Every existing/new event entry point applies its operation's local role and tenant checks; staff discovery is filtered to explicit grants.
- [ ] Owners/Organizers retain all-event access within their organization and existing creation/import behavior; both manage event grants, while Team invitations remain Owner-only.
- [ ] Staff can be admitted without gaining an event; an explicit Owner/Organizer grant enables only the chosen event/mode. Revocation and disabled/inactive identity/membership deny subsequent operations.
- [ ] Wefter entry and DTOs exclude the full roster and private fields; fixture-based ownership checks cover all denied paths.
- [ ] Event/guest/local-user/membership IDs and canonical event-pair conventions are documented and validated; Sponsor/VIP guest status grants no Console access.
- [ ] Real access updates use atomic revision checks and expose latest authorized saved data on conflict; concurrent first grants and revocations cannot lose edits.
- [ ] Multi-organization selection, session/cache transitions, empty/loading/error/conflict UI and direct API/action denial pass acceptance.
- [ ] `pnpm verify`, `pnpm build`, isolated database cases, signed-in role flows, and relevant admission/provider scenarios have actual results; unresolved blockers remain explicit.
- [ ] Record F08's persisted pair-uniqueness and F12's real own-assignment isolation obligations in the contract/handoff. These later-feature checks do not block F01 foundation completion and must not be claimed as already passed.

No generic workflow/authorization engine, operator tasks, communications, sponsor dashboard, future feature tables, or UI redesign. F02 owns settings/two Wefter slots; F03 owns attendee corrections/duplicates; F08 owns stored pairs; F12 owns stored assignments.

## Context and inspected baseline

The supplied F01 plan/spec and change index were present as uncommitted work at implementation start; they are preserved and updated in place. Legacy authentication/onboarding plans are historical references, not instructions to execute. Current [Product](../../product.md), [Architecture](../../../ARCHITECTURE.md), [Domain](../../domain.md), [Authentication](../../backend/authentication.md), [Imports](../../backend/attendee-imports.md), and [Verification](../../VERIFICATION.md) define the baseline.

| Current path | Finding and implementation implication |
| --- | --- |
| `src/infrastructure/auth/current-user.ts`, `resolve-current-user.ts` | Verified Clerk session resolves existing local UUID through an instance-scoped enabled mapping; preserve this boundary |
| `src/modules/organizations/console-access.ts`, `types.ts`, `service.ts`, `repository.ts` | Only Owner/Organizer Console access today; organization creation permission is reused for event reads/imports and must not become a broad staff bypass |
| `src/infrastructure/database/schema/identity.ts`, `schema/events.ts` | Four local roles; event/guest UUIDs; composite tenant-safe `event_staff` foreign keys; staffing rows currently grant no access |
| `src/modules/events/server/service.ts`, `repository.ts` | Event reads/covers/list and creation use Owner/Organizer checks; detail returns the full guest roster and import history |
| `src/modules/events/server/attendee-import-service.ts`, `attendee-import-repository.ts` | Import rechecks local membership while locking membership then event; preserves atomic append/replay/capacity; do not replace with blanket version conflicts |
| `src/modules/organizations/invitations/` and `schema/organization-invitations.ts` | Team admission/UI/database check accept only Owner/Organizer today; staff admission requires both sides of this interface to change |
| `src/infrastructure/auth/console-page-context.ts`, `src/app/account/actions.ts` | Actor-bound organization selection cookie exists; resolver has no selection result/route; render helpers attempt cookie deletion |
| `src/app/events/layout.tsx`, event routes, `src/infrastructure/http/` | Organizer shell and API role checks must be revised together; layout permission alone cannot secure nested operations |
| `src/modules/events/event-dto.ts`, `queries/`, `components/events-query-provider.tsx` | Strict DTOs and actor/session/organization cache scoping exist; add isolated restricted projections and permission-transition behavior |
| `src/shared/lib/application-error.ts`, `src/infrastructure/http/errors.ts` | `CONFLICT` already maps to 409; no typed current-snapshot details or replacement-edit contract yet |

Installed Next.js guides inspected: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `data-security.md`, and `01-app/03-api-reference/04-functions/cookies.md`. They require authorization near data/actions, minimal client DTOs, and cookie writes in actions/handlers. Read relevant route/cache guides again when implementation reaches those changes. [Design direction](../../design/design.md) and [actual design-system baseline](../../design/design-system.md) apply to entry/conflict UI; reuse installed primitives and existing Event Detail/Team conventions. F01's small access controls do not depend on obtaining F02's separate supplied designs.

## Steps and progress

### 1. Finalize the contract and establish the implementation baseline

- [x] Read the supplied backlog, current canonical docs, affected schema/services/routes/client callers/tests, and working tree.
- [x] Confirm that Owner/Organizer event scope remains organization-wide.
- [x] Record current gaps and wire/data/access contracts in the linked specification.
- [x] Finalize Antonio's decisions: Owner/Organizer grant administration, read-only staff operators, and the F01 Wefter foundation/F12 assignment boundary. Preserve the agreed scope, Staff-tab placement and implementation defaults. Sheary's consumer review is not claimed as completed.
- [x] Reconcile the five known account/selection test failures with the agreed entry/selection behavior; implement the selector/safe-switch flow rather than weakening tenant-denial assertions.

Deliverable: one permission matrix and agreed ID/revision/error formats that Sheary can use for F02/F04/F05/F08/F09 without inventing independent rules.

### 2. Add minimal access persistence and staff admission

- [x] Extend `event_staff` with nullable mode and monotonic revision as specified; existing rows remain ungranted. Cover tombstone revocation and first-row creation without version reset.
- [x] Extend Team staff invitation validation, UI, local role constraint and exact admission/replay behavior; preserve current handling of existing memberships and initial Owner provisioning.
- [x] Generate migrations with `pnpm db:generate`; review generated SQL/metadata and compatibility with existing event/import/invitation records. Never edit generated snapshots or apply migrations at startup.
- [x] Implement event-owned access repository/service and Owner/Organizer-only list/update endpoints. Candidate and target membership checks are event-organization scoped. Lock relevant membership rows in stable order before event/grant rows. PostgreSQL contention remains gated on an explicitly disposable target.

Deliverable: staff admission and versioned event grants work independently of future settings/assignments. No provider roles or existing staffing rows silently become local authority.

### 3. Enforce access through existing entry points

- [x] Separate Console organization selection from operation-specific event authorization; keep creation/import and Team/admin checks narrow.
- [x] Add event-grant discovery and event-specific direct reads for staff. Resolve and scope resources using the server actor and event organization.
- [x] Update event detail/cover/import boundaries together; operators may read event details/rosters, imports remain Owner/Organizer-only, and Wefters are denied full detail/roster responses.
- [x] Implement local organization selection and safe switch/sign-out handling. Cookie mutations are in Server Actions; stale/forged actor-bound selections require explicit choice.
- [x] Provide restricted operator and Wefter entry pages with read-only roster and minimal context/empty state; preserve organizer presentation.
- [x] Keep a strict Wefter DTO separate from full event detail. Existing Event Detail cache remains scoped by actor/session/organization; server authorization is rechecked for every request.

Deliverable: staff with a grant can enter their intended experience; staff without a grant, other-event users and sponsors cannot enter it through a guessed endpoint.

### 4. Establish IDs, pair normalization and conflict handling

- [x] Publish explicit owning schemas/types for existing UUIDs and timestamp/null conventions. Preserve DTO names and import provenance.
- [x] Add Network's pure ordered-pair validator with reversed-order/self-pair/UUID-normalization cases. Document F08 database uniqueness and event-scoped foreign-key requirements; do not create its tables early.
- [x] Enforce `expectedRevision` in access writes with compare-and-increment inside the authorized transaction. Unit coverage covers stale snapshots; PostgreSQL contention remains gated.
- [x] Extend the sanitized error envelope with typed conflict details, validating only authorized DTO snapshots. Existing import/create error fields remain compatible.
- [x] Add Owner/Organizer access controls and conflict presentation in Event Detail's existing Staff tab, preserving drafts and showing latest saved values before deliberate retry. F02's settings/two-slot/availability screen stays with F02. Staff operators cannot use these controls or their direct API/actions.
- [x] Document how F02/F03/F05 adopt the replacement-edit contract, while preserving locked append semantics for imports and keeping profile approval/content versions distinct.

Deliverable: one real conflict-safe mutation and reviewable UI behavior, plus tested pair/ID contracts that later owners consume.

### 5. Verify the foundation and hand off consumer requirements

- [x] Add meaningful behavior tests using existing Node/`loadTs` patterns for policy, admission validation, DTO redaction, pair normalization, conflicts, and account/organization selection.
- [x] Run gated PostgreSQL access/invitation coverage and apply the reviewed F01 migrations on the explicitly authorized development test database. Access transactions cover concurrent first saves, revision increments, revocation tombstones, inactive-owner denial, and a save racing a locked membership revocation; staff invitation persistence passes.
- [x] Run `pnpm verify` and `pnpm build`; fix scoped failures and record exact remaining prerequisites/failures.
- [ ] Verify signed-in Owner, Organizer, staff operator, Wefter, sponsor, ungranted/revoked/disabled and cross-tenant flows. Verify mobile/desktop, keyboard/focus, loading/empty/error/conflict and account/organization switching.
- [x] Update canonical authentication/domain/architecture/product docs to reflect only implemented behavior, plus a focused shared-contract reference linked from the docs index. Update invitation, attendee-import, and Verification docs for staff admission, event access and new tests.
- [x] Prepare the shared-contract handoff in [Shared access contracts](../../access-contracts.md) and record integration next steps. No Sheary review is claimed. Keep this plan active until isolated database and signed-in browser acceptance passes; track later persisted-pair/assignment acceptance under F08/F12.

## Decisions and discoveries

- 2026-10-17: The backlog deliberately assigns later tables/APIs to their feature owners; F01 does not scaffold profiles, matching runs, pairs, bookings or assignments.
- 2026-10-17: Antonio confirmed Owner/Organizer organization-wide event access, with event-specific staff/Wefter grants. Both Owners and Organizers manage grants; Team invitations remain Owner-only. Staff operators have reads only. F12 owns assignment persistence/screens; F01 delivers the Wefter access foundation. The finalized plan places access/conflict controls in the existing Staff tab.
- 2026-10-17: Staff admission is an actual dependency: existing Team invitation validation and database checks only allow Owner/Organizer. A newly allowed staff login also needs an effective event grant and an appropriate shell.
- 2026-10-17: Current imports already serialize append operations and update `events.updatedAt`; timestamp freshness cannot serve as a general replacement-edit revision.
- 2026-10-17: Five existing selection/account tests failed at planning baseline. The local selector, stale-selection routing, explicit switch/sign-out actions and Team account control now cover those paths; the final full suite passes without changing tenant-denial assertions.
- 2026-10-17: Wefter assignment and pair persistence do not exist. F01 can prove access-policy/redaction contracts with fixtures, but F12/F08 must prove real assignment isolation and pair uniqueness. Do not report those cross-feature criteria as passed in F01's foundation handoff.

## Verification

Final verification on 2026-10-18 (initial implementation checks were run on 2026-10-17):

| Check | Actual result |
| --- | --- |
| Initial `git status --short` | The supplied F01 plan/spec and change index were already uncommitted; preserved throughout implementation. |
| `pnpm verify` | Passed on 2026-10-18 after all test and documentation updates. Harness docs, lint, TypeScript, and all unit tests passed: 247 total, 237 passed, 10 gated database tests skipped. The trailing typecheck passed. |
| `pnpm build` | Passed on 2026-10-18 with Next.js 16.3.5 Turbopack; generated routes include event access, operator, selector and Wefter entry points. |
| `pnpm db:generate` | Passed twice as schema evolved; generated migrations `0005_old_moondragon.sql` and `0006_early_unus.sql` plus Drizzle metadata were reviewed. |
| Migration compatibility | Read-only preflight confirmed the dev database journal matched local migration 0004, the existing invitation check/data were compatible, and no existing event staff rows needed backfill. Applied migrations 0005 and 0006 with `node --env-file=.env.local scripts/migrate.mjs`; a second run completed with the journal still at seven entries. |
| F01 access database integration | Passed on `weft_console_test` with `WEFT_DATABASE_TEST=1 node --env-file=.env.local --test tests/event-access-database.test.mjs`: concurrent first saves, revision increments, tombstone revocation, inactive-owner denial and a save racing a locked membership revocation passed. The randomized fixtures cleaned up. |
| Gated PostgreSQL suite | Final run: 13 passed, 0 failed across all six database test files on `weft_console_test`. The first run exposed an existing customer-provisioning test-fixture conflict; corrected it to use a separate user for the disabled identity, consistent with `identity_user_provider_instance_unique`. |
| Signed-in browser role flows | Not run. No signed-in Owner/Organizer/operator/Wefter browser session was established during this implementation. |
| Live provider and F08/F12 acceptance | Not run; no provider settings/invitations changed. F08 persisted pair uniqueness and F12 saved-assignment isolation remain owned by those features. |
| `pnpm check:docs` / `git diff --check` | Both passed after the latest plan, test and documentation edits. |

Remaining acceptance must include signed-in coverage for two organizations, two events in one organization, each role/mode, two distinct Wefters, denied direct requests, redaction after revocation, mobile/desktop layout, keyboard/focus, empty/error/conflict UI, and account switching. Admission provider delivery and F08/F12 consumer acceptance remain separate. Do not run `build:vercel` for local verification.

## Handoff or outcome

UI follow-up: the [F01–F03 UI repair](2026-10-18-f01-f03-ui-repair.md) consolidates event access and Wefter hours, uses the display label “Roster access,” and replaces technical conflict copy. It does not close this feature's outstanding separate-role acceptance.

F01 application, migration, unit-test, UI and canonical documentation changes are implemented in the working tree. The two generated migrations are applied to the explicitly authorized development `weft_console_test` database; the F01 access and staff invitation integration tests passed and cleaned their fixtures. Production, customer records, provider settings and invitations were untouched. The plan remains active for signed-in browser acceptance. F02 can begin against [the agreed grant/ID/conflict contracts](../../access-contracts.md); F08/F12 own their recorded persisted-pair and assignment obligations. No Sheary review is claimed.
