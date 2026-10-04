# Invitation Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:subagent-driven-development only if the user chooses delegated execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organization invitations automatically establish the accepted account's local identity and invited membership, then open its Console without per-user provisioning scripts.

**Architecture:** Clerk Organization invitations handle email and authentication. A Neon invitation ledger and organization identity mapping bind accepted provider evidence to an owner-authorized Weft grant. Explicit completion mutations provision atomically; existing read guards remain read-only and Neon remains authoritative.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, installed `@clerk/nextjs` 7.9.10 / Backend SDK 3.22.0, Drizzle, PostgreSQL/Neon, Zod, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-04-invitation-onboarding-design.md` (proposed design accompanying this plan; review both before implementation).

## Global Constraints

- Enable Clerk Organizations with **Membership optional**, keep restricted registration and email enabled, and disable end-user organization creation and automatic domain enrollment.
- All transport memberships use `org:member`; Weft owner/organizer roles remain only in Neon.
- First release: active Neon owners can invite `owner` or `organizer`, list invitation history and revoke pending invitations.
- Invitations expire after **7 days**.
- Normalize invitation addresses with trim and lowercase; do not strip dots or plus aliases.
- No webhook is necessary for correctness.
- Normal protected reads never create users or memberships.
- No dependency additions; use installed Clerk prebuilt components and SDK. Preserve existing UUIDs, role checks and identity revocations.
- Do not mutate Neon or cookies in a Server Component GET/render.
- Production deployment and real invitation emails are outside this planning task.

## Review Focus

- An account whose secondary email received the invitation must work; plus/dot aliases must not accidentally match another address (Task 4).
- A successful provider send followed by a lost response must recover the same invitation rather than email twice (Task 3).
- A valid account joining its second organization must retain its original UUID and roles and enter the newly invited organization (Tasks 4–5).
- A revoked local membership must stay revoked even when an old accepted provider invitation is replayed (Task 4).
- Restricted registration, pending authentication tasks and wrong-account switching must work through the actual provider ticket flow (Tasks 5–7).

## Execution prerequisites

Read the spec and this plan together. The user requested planning, not implementation. Review the proposed Clerk Organizations bridge and permission scope before executing. Do not silently enable provider Organizations: the Clerk Organizations skill explicitly requires a deliberate decision before activation.

The alternative of migrating all Weft authorization to Clerk Organizations is outside this plan. The bridge adds provider organization records solely to use existing invitation delivery and acceptance. There is no ongoing automatic synchronization of provider roles into Neon.

The repository was clean at inspection. `docs/domain.md`, `docs/engineering.md`, `docs/adr/` and root `specs/` were absent; use existing documentation under `docs/superpowers/`. Do not remove or rewrite old migrations. Documentation-only planning does not require runtime tests or database access.

At implementation time, create an isolated checkout if necessary using `superpowers:using-git-worktrees`. Read relevant installed Next.js guides before writing route/action code; the local guides, rather than remembered APIs, govern this version. Verify Clerk ticket component behavior against installed types and current official docs.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `src/infrastructure/database/schema/organization-invitations.ts` | Provider organization mappings, invitation ledger and database constraints |
| `src/modules/organizations/invitations/types.ts` | Invitation DTOs, provider evidence and operation results |
| `src/modules/organizations/invitations/validation.ts` | Email, role and UUID validation; address normalization |
| `src/modules/organizations/invitations/repository.ts` | Locked ledger operations, delivery leases, transactional admission |
| `src/modules/organizations/invitations/service.ts` | Owner-authorized send/list/revoke and reconciliation |
| `src/modules/organizations/invitations/completion.ts` | Framework-independent verification and acceptance orchestration |
| `src/modules/organizations/invitations/clerk-provider.ts` | Server-only Clerk SDK adapter and sanitized provider errors |
| `src/modules/organizations/invitations/components/` | Team form/list, authentication entry and completion/recovery UI |
| `src/app/settings/team/` | Thin owner-gated Team page and Server Actions |
| `src/app/accept-invitation/`, `src/app/onboarding/` | Authentication entry and explicit admission actions |
| `scripts/setup-clerk-organizations.ts` | Dry-run-first organization bridge setup, not user enrollment |

### Task 1: Persist organization mappings and invitation lifecycle

**Files:** Create schema, types, validation and repository files from the table; modify `src/infrastructure/database/client.ts`; generate the next forward migration plus Drizzle metadata under `drizzle/`; create `tests/organization-invitation-validation.test.mjs` and `tests/organization-invitation-database.test.mjs`.

**Interfaces:**
- `InvitedRole = "owner" | "organizer"`; `InvitationStatus = "pending" | "accepted" | "revoked" | "expired"`; `DeliveryState = "queued" | "sending" | "sent" | "unknown" | "failed"`.
- `InvitationRecord`: all ledger fields named in the spec using camelCase; nullable IDs/timestamps represented as `null`, timestamps as `Date`.
- `InvitationView = { id: string; email: string; role: InvitedRole; status: InvitationStatus; deliveryState: DeliveryState; createdAt: string; expiresAt: string; providerCleanupPending: boolean }`; never includes tickets or raw provider errors.
- `parseInvitationInput(value: unknown): { email: string; role: InvitedRole }` rejects addresses over 254 characters and unsupported roles.
- `reserveInvitation(input: { organizationId: string; instanceId: string; inviterUserId: string; email: string; role: InvitedRole; now: Date }): Promise<{ invitation: InvitationRecord; created: boolean }>` rechecks/locks current owner membership and atomically returns the pending duplicate without editing it.
- `findInvitation(id: string, instanceId: string): Promise<InvitationRecord | null>` and `listInvitationViews(organizationId: string, instanceId: string): Promise<InvitationView[]>`.

- [x] Write tests for normalization, roles, UUIDs, reservation concurrency/duplicates, instance scope and expiration; the isolated database test also covers FK-backed records and transaction/replay behavior.
- [x] Run the focused validation tests; they passed after implementation.
- [x] Implement schema and repository contracts with the specified constraints, explicit expiration transition and provider cleanup flag.
- [ ] Generate and inspect the migration (done); apply it only to an explicitly verified isolated database and execute real transaction cases. `DATABASE_TEST_URL` is absent, so the real database test remains skipped.
- [x] Run focused invitation tests and `pnpm typecheck`; not committed because repository metadata is read-only in this environment.

### Task 2: Add the Clerk transport and organization setup

**Files:** Create `clerk-provider.ts`, `scripts/setup-clerk-organizations.ts`, `tests/organization-invitation-provider.test.mjs`, `tests/organization-auth-setup.test.mjs`; extend types/repository from Task 1; update `docs/backend/authentication.md` with prerequisites.

**Interfaces:**
- `ProviderInvitation = { id: string; organizationSubject: string; email: string; correlationId: string | null; status: "pending" | "accepted" | "revoked" | "expired" }`.
- `ProviderAcceptance = { subject: string; organizationSubject: string; membershipId: string; correlationId: string; acceptedAt: Date; verifiedEmails: string[]; displayName: string; avatarUrl: string | null }`.
- `InvitationProvider`: `send(input: { organizationSubject: string; email: string; correlationId: string; redirectUrl: string }): Promise<ProviderInvitation>`; `findByCorrelation(organizationSubject: string, correlationId: string): Promise<ProviderInvitation | null>`; `revoke(organizationSubject: string, invitationId: string): Promise<void>`; `readAcceptance(organizationSubject: string, subject: string, correlationId: string): Promise<ProviderAcceptance | null>`.
- `findOrganizationIdentity(organizationId: string, instanceId: string): Promise<{ organizationSubject: string } | null>` and `saveOrganizationIdentity(input: { organizationId: string; instanceId: string; organizationSubject: string }): Promise<void>`; reject reassignment.

- [x] Write and run adapter tests for the SDK payload, pagination, acceptance evidence and sanitized errors.
- [x] Write and run setup tests for dry-run, target gates, idempotence, conflict and exact-metadata recovery.
- [x] Run the provider and setup tests; they passed.
- [x] Implement the server-side Clerk adapter and dry-run-first setup command. Live provider behavior remains unverified.
- [ ] Check the development provider settings read-only. Record the required settings changes and their environment; do not enable them or send emails until execution authorization covers those actions. Prove the installed prebuilt components support tickets and the configured restricted signup; record the result for Task 5.
- [x] Run focused tests and typecheck; not committed because repository metadata is read-only in this environment.

### Task 3: Implement owner-only send, retry, list and revoke

**Files:** Create `service.ts`, `tests/organization-invitation-service.test.mjs`; extend repository and database cases.

**Interfaces:**
- `InvitationAdminActor = { userId: string; organizationId: string }` is supplied by trusted server context, not raw form input.
- `sendInvitation(actor: InvitationAdminActor, input: { email: string; role: InvitedRole }): Promise<{ kind: "sent" | "existing" | "delivery-pending"; invitation: InvitationView }>`.
- `retryInvitationDelivery(actor: InvitationAdminActor, invitationId: string): Promise<InvitationView>`; `revokeInvitation(actor: InvitationAdminActor, invitationId: string): Promise<InvitationView>`; `listInvitations(actor: InvitationAdminActor): Promise<InvitationView[]>`.
- Repository adds `claimDelivery(id: string, now: Date): Promise<boolean>` (60-second lease), `recordDelivery(id: string, result: { state: DeliveryState; providerInvitationId: string | null; errorCode: string | null }): Promise<void>`, and `revokePendingInvitation(actor: InvitationAdminActor, id: string): Promise<InvitationRecord>` with owner and organization checks under lock.

- [ ] Write service tests: anonymous/nonowner/cross-organization calls denied; owner invitation allowed; duplicate requests email once and preserve role; existing active members rejected without role changes; inactive members rejected; external timeout records unknown; retry first reconciles and attaches a previously sent provider invitation; live lease blocks concurrent send; lease recovery reconciles before sending; no evidence of outcome stays unknown; expired/revoked rows require fresh invitation IDs.
- [ ] Write race tests: owner removed before local authorization transaction denies send; revoke-before-admission prevents membership; admission-before-revoke reports already accepted; provider revocation failure retains local revoked status and cleanup warning. Pagination and multiple provider matches must not silently choose an invitation.
- [x] Run the service tests; implementation failures were fixed and the final focused suite passed.
- [x] Implement the durable send/reconcile sequence, owner checks, local-first revocation and sanitized logs.
- [x] Run focused service tests and typecheck; the isolated database test remains skipped and the changes are not committed in this read-only `.git` environment.

### Task 4: Complete accepted invitations transactionally

**Files:** Create `completion.ts`, `tests/organization-invitation-completion.test.mjs`; extend repository and transactional database cases.

**Interfaces:**
- `CompletionResult = { kind: "complete"; userId: string; organizationId: string } | { kind: "unavailable" | "wrong-account" | "conflict" | "retry" }`.
- `completeInvitation(input: { instanceId: string; subject: string; invitationId: string }): Promise<CompletionResult>` consumes Task 2 provider evidence; production entry obtains subject from Clerk, never caller identity.
- `commitAdmission(input: { invitationId: string; instanceId: string; evidence: ProviderAcceptance }): Promise<CompletionResult>` is the repository transaction boundary. Missing mapping creates a UUID; exact enabled mapping reuses it. Recheck local status, expiry/acceptance time and active owner inside the transaction.
- `discoverAcceptedInvitations(input: { instanceId: string; subject: string }): Promise<Array<{ invitationId: string; organizationName: string }>>` is read-only. Query candidate ledger rows by verified emails, then verify exact provider evidence; return only subject-owned invitations.

- [ ] Write tests asserting one new user, one identity, one membership and one accepted invitation; existing identity keeps its UUID/profile and other organizations; existing active membership keeps its role. Wrong instance, forged locator, wrong provider organization/subject/correlation, unverified email and bare account creation produce zero writes. Secondary verified email works; plus/dot aliases don't match. Disabled mapping and inactive membership return conflict.
- [ ] Write tests for timely acceptance followed by delayed local completion; expired-before-provider-acceptance denied; inviter no longer owner denied; repeated completion for the same subject is idempotent; different-subject replay denied; post-acceptance membership revocation and identity disabling stay effective. Discovery is read-only and never links local users by email.
- [ ] Add real transaction tests for two completions of one invite, two invitations for the same subject across organizations, acceptance/revocation races and injected failure after identity insert. Assert exact final row counts and rollback of all writes on failure. Serialize identity creation using a transaction advisory lock keyed by instance/subject and lock invitation/authorizing owner rows in a documented consistent order.
- [x] Run completion tests; implementation failures were fixed and the final focused suite passed. Evidence checks and the transactional repository boundary are implemented, with no provider calls inside the transaction.
- [ ] Run completion tests and typecheck (done); isolated DB execution remains skipped because no `DATABASE_TEST_URL` is configured. Changes are not committed in this read-only `.git` environment.

### Task 5: Connect ticket authentication, completion and recovery

**Files:** Create `src/app/accept-invitation/page.tsx`, `src/app/accept-invitation/actions.ts`, `src/app/onboarding/page.tsx`, `src/modules/organizations/invitations/components/invitation-auth.tsx`, `completion-form.tsx`; modify `src/app/access-required/page.tsx`, `src/app/account/actions.ts`, `src/shared/ui/console-account.tsx`; create `tests/invitation-onboarding-routes.test.mjs`; update `tests/console-route-auth.test.mjs` and account tests.

**Interfaces:**
- `finishInvitation(invitationId: string): Promise<{ kind: "unavailable" | "wrong-account" | "conflict" | "retry" }>` is a Server Action. It verifies active Clerk session/configuration, invokes `completeInvitation`, sets the existing user-bound `weft_organization_id` cookie only after success, and redirects to `/` outside any error-catching block. Use HttpOnly, SameSite=Lax, path `/`, Secure in production, matching existing cookie conventions.
- `CompletionForm({ invitationId: string })` automatically invokes the action once per mounted invitation and prevents duplicate submissions; recoverable errors render a deliberate retry button rather than an endless loop.
- `InvitationAuth({ invitationId: string })` handles provider authentication status with installed prebuilt components and preserves the ticket/local locator until completion. It renders no organization details before a verified session proves ownership.

- [ ] Write route/action tests: signed-out and pending sessions cannot provision; forged client subject is ignored; cookie is written only after committed completion and bound to returned user; multiple-organization acceptance selects the invited organization; failure writes no cookie; redirect is same-origin; `complete` status still requires server evidence; invalid locator gives safe copy.
- [ ] Write recovery tests: no evidence shows access state plus logout; a proven accepted invitation triggers completion; mapped user can recover a second organization through `/onboarding`; several eligible invitations require a choice; browser retry after failed DB commit completes once; old links cannot resurrect removed access.
- [x] Run route and authorization tests; they passed.
- [x] Implement public `/accept-invitation` with a narrowly documented route exception. `/onboarding` and `/access-required` guard directly with `requireClerkSession`; protected reads remain non-provisioning; account recovery destination is present.
- [x] Add URL cleanup and no-referrer behavior, safe wrong-account sign-out, and server-side evidence checks. Installed SDK behavior was verified from local docs/types; actual ticket flows remain a live verification item.
- [x] Run route/account/authorization tests and typecheck; changes are not committed in this read-only `.git` environment.

### Task 6: Expose Team invitations to organization owners

**Files:** Create `src/app/settings/team/page.tsx`, `actions.ts`, `src/modules/organizations/invitations/components/team-invitations.tsx`, `tests/team-invitations.test.mjs`; modify `src/shared/ui/console-account.tsx` and `src/app/globals.css` only as necessary.

**Interfaces:**
- Team page requires `requireOrganizerPageContext()` followed by an explicit active-owner check before listing invitations.
- Server Actions `sendTeamInvitation(formData: FormData)`, `retryTeamInvitation(formData: FormData)` and `revokeTeamInvitation(formData: FormData)` derive user and selected organization on each call, validate payloads, invoke Task 3 services and return safe action state. Form input contains email/role or invitation UUID only.
- `TeamInvitations({ invitations: InvitationView[] })` uses existing Surface/button/form styling and inline action results. Add “Team” in the account menu only when `organization.role === "owner"`; hiding the link is not authorization.

- [ ] Write behavioral tests: owner sees organization name, recipient email field, role choices and invitation statuses; organizer direct navigation/actions denied; role/organization tampering denied; duplicate click doesn't send twice; queued/unknown/failed never display “Invitation sent”; revoked/expired/accepted entries have correct actions; pending revoke failure displays cleanup state without implying access remains allowed. Tests must exercise actions/services, not merely regex-check markup.
- [x] Run the Team action tests; they passed.
- [x] Implement the owner-only Team invitation page and action controls with invitation history, inline status, retry and revoke.
- [x] Run Team action/account/sidebar tests and typecheck. Keyboard and narrow-screen presentation received source-level review; changes are not committed in this read-only `.git` environment.

### Task 7: Verify end to end and document the rollout

**Files:** Update `docs/backend/authentication.md`, this plan's completion checklist and the design status; create `docs/backend/invitation-onboarding.md`. Use existing automated suites and browser tools; no E2E dependency is needed solely for this task.

**Interfaces:** Consumes all completed tasks. Produces an environment-specific verification record, operational recovery instructions and an explicit release readiness decision.

- [x] Run the required lint, typecheck, full test suite and webpack build. Lint passed; typecheck passed; tests passed (154 total, 146 passed, 8 database-gated skipped); webpack build passed. Real transactional database cases remain pending because no `DATABASE_TEST_URL` is configured.
- [ ] In the authorized development instance, enable the reviewed settings, apply the new migration and set `WEFT_APP_ORIGIN`. Run organization setup dry-run, review its exact target and then apply. Confirm existing mapped organizers retain access without provider org membership. Preserve public-signup restriction and test a no-invitation signup attempt.
- [ ] Establish one explicitly approved initial owner only if none exists. Preserve the user's existing Clerk account. No first-user promotion and no automatic linking of unrelated historical local UUIDs by email. Document that this is initial tenant bootstrap, not per-recipient onboarding.
- [ ] With explicitly authorized development test recipients, verify invite → email → new account → automatic local mapping/membership → correct dashboard. Repeat for existing signed-out account, already signed-in account, secondary verified email, second organization, wrong-account switch, pending session task and seven-day expiry. Verify role `owner` and `organizer` separately, plus denial for unsupported/forged roles.
- [ ] Verify browser refresh and navigation after interruption; simulate a provider timeout, DB outage, unknown send outcome and revocation race. Successful recovery must not need a script or a new account. Revoke local membership and prove old invite replay cannot restore it. With no pending eligible invite, `/access-required` stays a legitimate denied-access state.
- [x] Update authentication lifecycle docs and add operator guidance for ownership authority, provider setup, instance separation, delivery recovery, local-first revocation and fresh invitations.
- [x] Review the implementation against the spec and permission tests (self-review, as requested, without subagents); findings fixed. Changes are not committed in this read-only `.git` environment.
- [x] Use `superpowers:verification-before-completion`; report live integration and rollout as outstanding. No invitation was sent and no deployment occurred.

## Acceptance criteria

- A valid owner/organizer invitation leads a new user into the correct Console immediately after authentication; no administrator runs a per-recipient script.
- The currently blocked Clerk account can accept a fresh organization invitation and obtain access without account recreation.
- Existing members retain UUIDs, original roles and access to other organizations.
- Arbitrary signup, bare application invitations, query-string roles and provider-only memberships grant no Weft access.
- Repeated or concurrent setup does not duplicate users or regrant revoked access.
- Recovery after transient failure is available to the recipient in the UI; provider delivery ambiguity never silently causes duplicate email.
- Lint, typecheck, tests, isolated database verification and signed-in browser scenarios have recorded results.

## Self-review record

Plan checked against the accompanying design for all data fields, states, permission rules, delivery/reconciliation, transaction boundaries, authentication statuses, recovery paths and rollout prerequisites. The cleanup flag was made explicit in Task 1. All five Review Focus items map to behavioral tests. Interfaces use the same correlation UUID, instance scope and completion result throughout. Live provider settings and restricted-signup ticket compatibility remain execution verification requirements, not assumptions of proven functionality.

Implementation status: repository code, mocks, route/action flows, setup utility and operator documentation are implemented. Required local checks are recorded after the implementation turn. Live Clerk settings, migration application, owner bootstrap, actual delivery/ticket acceptance and signed-in browser scenarios remain unchecked by explicit user scope. The isolated transactional test is ready but skipped unless `WEFT_DATABASE_TEST=1` and a verified `DATABASE_TEST_URL` for `weft_console_test` are supplied. No implementation commit was created because `.git` is read-only in this environment.

Final local verification: `pnpm lint` passed; `pnpm typecheck` passed; `pnpm test` passed with 154 tests (146 passed, 8 database-gated skipped); `pnpm exec next build --webpack` passed on Next.js 16.3.5. `git diff --check` passed.
