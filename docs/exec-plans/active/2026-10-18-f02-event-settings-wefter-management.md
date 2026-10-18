# Implement F02 Event settings and Wefter management

Status: Active — implementation, Neon database acceptance, and signed-in Owner UI acceptance complete; separate role sessions remain unavailable
Owner: Antonio
Reviewer: Antonio
Created: 2026-10-18
Specification: [F02 behavior and interfaces](../../changes/2026-10-18-f02-event-settings-wefter-management.md)

## Goal and acceptance criteria

Implement persisted event networking settings and any number of named Wefters using existing Console UI and F01 contracts. Owners and Organizers set availability hours. Wefters cannot edit availability; their own hours may be displayed read-only. The linked Ready specification records the agreed behavior, interfaces, scope changes and F12 integration boundary.

Affected tenants: every organization using Console events. Affected roles: Owner/Organizer administrators, restricted Wefters, and denied Operator/sponsor/attendee/inactive/outsider paths. This saved plan authorizes no implementation during its preparation; the next session is expected to receive an explicit implementation instruction. Live database operations require separate explicit authorization under Verification.

- [x] Settings persist across reads; valid partial configuration remains saveable and missing values are shown without suggested defaults.
- [x] Networking windows, cutoff, landmarks and focused product limits validate and use the event timezone.
- [x] Zero, one and more than two Wefters are supported; selection grants restricted access atomically and preserves tenant boundaries.
- [x] Owner/Organizer availability intervals save correctly; Wefters have no schedule-write permission or availability toggle.
- [x] Operator conversion, Wefter removal, availability clearing on mode change and revision tombstones remain consistent through both administrative interfaces.
- [x] Concurrent settings edits and access/schedule races expose authorized latest data without silently losing changes or drafts.
- [x] Restricted own-schedule reads expose only the requesting Wefter's hours.
- [ ] Interactive role sessions, responsive layout, keyboard/focus, session/organization transitions and direct API denials pass acceptance. Owner desktop/mobile and keyboard checks plus automated role-denial coverage passed; separate Organizer/Wefter sign-ins are unavailable.
- [x] Generated migration compatibility, PostgreSQL cases, `pnpm verify`, `pnpm build` and available browser checks have actual evidence; skipped suites remain explicit.
- [ ] Canonical documentation and F08/F09/F11/F12 consumer contracts reflect delivered behavior, including F12's unimplemented active-introduction protection obligation.

## Context

Read [Product](../../product.md), [Architecture](../../../ARCHITECTURE.md), [Domain](../../domain.md), [shared access contracts](../../access-contracts.md), [Engineering](../../engineering.md), [Design](../../design/design.md), [Design system](../../design/design-system.md) and [Verification](../../VERIFICATION.md). Read relevant installed Next.js guides before framework changes.

The [F01 active plan](2026-10-17-f01-console-access-shared-rules.md) records implementation in the working tree, development database evidence and pending signed-in browser acceptance. Preserve its code, migrations, documentation and tests; do not infer F01 completion from F02 work. No F02 implementation exists at planning baseline.

Existing ownership and entry points:

- Events owns schema validation, settings/access services, repositories and Event Detail UI. Its current Staff panel administers F01 access grants; no separate Staff module is needed.
- `event_staff` already has membership/event/organization keys, nullable operator/Wefter mode and a monotonic revision. Schedule edits must share that revision.
- The restricted Wefter page currently returns minimal event context and an assignment placeholder; assignments belong to F12.
- Event Detail's query provider scopes cache lifetime by actor, Clerk session and organization. Preserve this boundary for new queries.

The external backlog is `/Users/antoniopertuz/Downloads/Weft_Console_Implementation_Backlog.md`; the linked specification contains the durable requirements and user overrides. No access to the older workflow document or separate designs is needed to execute this plan.

## Steps and progress

### 1. Establish baseline and accepted contracts

- [x] Inspect backlog, relevant current code/docs, F01 active work and working-tree state.
- [x] Confirm focused settings, existing Console UI, variable Wefter count, assignment granting access and organizer-controlled availability hours.
- [x] Save the Ready specification and active execution plan without implementing application changes.
- [x] Reinspect status/diff, relevant callers/tests and installed Next.js route/data-security/cache guides in the implementation session.
- [x] Run typecheck while implementing and confirm the implementation can build on the current F01 state.

### 2. Implement persistence and services

- [x] Add independent revisioned event settings, actor/timestamp metadata, networking windows, cutoff, stable landmarks and focused limits. Preserve imports and event metadata semantics.
- [x] Extend `event_staff` with availability windows and update metadata. Preserve existing grants/revisions and leave schedules empty by default.
- [x] Generate additive Drizzle migrations with `pnpm db:generate`; review SQL/metadata. Do not apply migrations automatically.
- [x] Implement strict settings/Wefter DTOs, validation and organization-scoped services/repositories using existing Events patterns.
- [x] Save Wefter grants/schedules atomically with existing lock/revision semantics. Existing access edits clear schedules when leaving Wefter mode.
- [x] Add server-side consumer reads and explicit missing-configuration/availability diagnostics; no later-feature workflow was added.

### 3. Implement APIs and UI

- [x] Add the settings and Wefter administrative GET/PUT interfaces defined in the specification. Preserve bounded input, mutation-origin checks, no-store responses and sanitized errors.
- [x] Add Settings to existing Event Detail navigation and extend Staff with a Wefter roster, person selection, explicit Operator-conversion explanation and availability interval editing.
- [x] Handle saved/loading/empty/error/validation/conflict states, preserving drafts and requiring deliberate stale-revision review.
- [x] Add restricted read-only own-hours display through an allowlisted projection. No Wefter schedule write endpoint exists.
- [x] Preserve event-scoped caches, focus/reconnect refresh, dirty settings drafts, per-Wefter drafts, and session/organization-scoped Console context.

### 4. Verify behavior and document the handoff

- [x] Add Node tests for strict settings validation, explicit empty/partial settings, schedule interval counts, event bounds and overlap. A gated F02 PostgreSQL suite is authored in `tests/event-settings-database.test.mjs`.
- [x] Add service/API authorization, DTO privacy, and denied role/tenant lifecycle tests.
- [x] With explicit authorization for the Neon `weft_console_test` target, verify migration compatibility, concurrent first saves, revisions and access/schedule races. Inspect setup/cleanup first and record cleanup outcomes.
- [ ] Verify separate signed-in Owner/Organizer and denied-role/tenant sessions, responsive layout, keyboard/focus and conflict/error recovery. Owner desktop/mobile and keyboard checks passed; API/DB tests cover organizer and denied roles. No separate Organizer or Wefter login was available for direct browser acceptance.
- [x] Run `pnpm verify`, `pnpm build`, and `git diff --check`; record actual commands, counts, skipped tests and blockers.
- [x] Update canonical product/domain/access/architecture references and owning backend documentation to match delivered behavior.
- [x] Record F12's obligation to protect active introductions across schedule/access changes, including F01 edits. Do not report that future assignment acceptance as passed.
- [x] Update this plan before handoff. Keep active only for unavailable separate-role browser sessions; F12 remains a separate feature boundary.

## Decisions and discoveries

- 2026-10-18: Antonio replaced the backlog's exactly-two-slot requirement with any number of named Wefters.
- 2026-10-18: Selecting a Wefter also grants event access. Preserve F01's single operator/Wefter mode per membership/event rather than inventing parallel authority.
- 2026-10-18: The final user decision allows only Owners/Organizers to set availability hours. Earlier current-status and Wefter self-service proposals are superseded. Wefters cannot change their hours or toggle availability.
- 2026-10-18: Focused settings and existing Console UI were selected. No suggested numbers are approved operating values.
- 2026-10-18: F01 is uncommitted active work with browser acceptance pending. Its existing authorization foundation must be preserved.
- 2026-10-18: F12 owns assignment storage, busy/booking checks and active-introduction recovery. F02 must document the integration contract without pretending nonexistent assignment enforcement is implemented.

## Verification

Implementation and acceptance evidence from 2026-10-18 follows. Migration `0007_jittery_kabuki.sql` was applied to the user-authorized Neon `weft_console_test` database through `node --env-file=.env.local scripts/migrate.mjs`; no production target was used. F01/F02 gated PostgreSQL fixtures cleaned up their random rows. The local development server was stopped during DB test runs and full verification/build.

| Check on 2026-10-18 | Actual result |
| --- | --- |
| `pnpm verify` | Passed: docs checks, lint, TypeScript, 259 tests (248 passed, 11 gated database tests skipped, 0 failed), and trailing TypeScript check. |
| `pnpm build` | Passed with Next.js 16.3.5 Turbopack; emitted Settings and Wefter API routes and Event Detail UI. |
| `pnpm db:generate` and migration | Generated additive `drizzle/0007_jittery_kabuki.sql` and `drizzle/meta/0007_snapshot.json`; reviewed generated SQL/metadata. Applied to authorized `weft_console_test` only via repository migration script. |
| F02 PostgreSQL suite | `WEFT_DATABASE_TEST=1 node --env-file=.env.local --test tests/event-settings-database.test.mjs` passed (1/1): concurrent first settings saves, persisted readback, organizer authorization, three Wefters, role/tenant denial, own-hours projection, out-of-event time rejection, F01 schedule clearing, stale-write conflict and tombstone reuse. Random fixtures cleaned up. |
| F01 PostgreSQL regression | `WEFT_DATABASE_TEST=1 node --env-file=.env.local --test tests/event-access-database.test.mjs` passed (1/1), covering concurrent grants, revocation tombstones and inactive-actor denial. Random fixtures cleaned up. |
| Focused settings tests | `node --test tests/event-settings-api.test.mjs tests/event-settings-service.test.mjs tests/event-settings-validation.test.mjs` passed (11/11). |
| Signed-in Owner browser | Loaded Event Settings and Staff/Wefters; verified explicitly empty/no-default settings, timezone copy, empty staff state, navigation, add-window/add-landmark, keyboard focus into date controls and 390×844 layout. Fixed mobile account-action wrapping. Did not save data to the existing QA event. |
| Separate-role browser acceptance | No separate Organizer, Wefter, sponsor or inactive-user sign-in was available. API/service and PostgreSQL tests cover those authorization paths; direct interactive role-session acceptance remains open. |
| `git diff --check` | Passed after final source, docs and plan updates. |

## Handoff or outcome

UI follow-up: the [F01–F03 UI repair](2026-10-18-f01-f03-ui-repair.md) consolidates Staff controls and repairs Settings composition and conflict review. This does not close the separate-role browser acceptance tracked here.

Next action: provide non-production Organizer and Wefter sessions if direct browser acceptance for those roles is required. Automated authorization, transaction behavior, signed-in Owner UI, responsive/keyboard checks, build and repository verification are complete. Keep this plan active until separate-role browser acceptance is available. F12 assignment persistence, busy checks and active-introduction protection are not implemented or claimed; F12 must integrate them with schedule/access mutations. No commit, push, deploy, invitation or production change was made.
