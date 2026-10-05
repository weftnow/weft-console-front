# Customer and Initial Owner Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:subagent-driven-development only if the user explicitly chooses delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An internal CLI creates a customer and pending initial Owner in Weft first, provisions Clerk invitation transport, and lets the recipient enter the Console after automatic, exactly-once Owner admission.

**Architecture:** Separate local customer bootstrap records from owner-managed teammate invitations. The CLI records business intent before external calls; Clerk stores correlation IDs and handles email/authentication only. Existing acceptance and recovery routes dispatch to the correct local grant, while Neon remains authoritative for roles and revocations.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, installed Clerk Next.js/Backend SDK, Drizzle, PostgreSQL/Neon, Zod, Node test runner. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-customer-owner-provisioning-design.md`.

## Global Constraints

**Implementation status (2026-10-04):** Repository implementation and mocked verification are complete. The required lint, typecheck, test suite, and webpack build passed. The isolated PostgreSQL integration suite was skipped because `DATABASE_TEST_URL` is not configured; migration application, live Clerk delivery, and signed-in browser acceptance remain outstanding and were explicitly excluded from this implementation.

- PostgreSQL owns business authorization.
- Clerk Admin/Member roles never determine Weft Owner/Organizer/Staff/Sponsor roles.
- After initial provisioning, all teammate invitations, role assignments, removals and team management belong inside Weft.
- No public bootstrap endpoint and no internal provisioning screen; initiation is an administrative CLI command.
- Initial Owner email and intended `owner` role live in local records; provider metadata contains only correlation UUIDs.
- Dry-run performs no writes and sends no email.
- Mutations require `WEFT_PROVISION_TARGET=development|test` and the verified Neon `weft_console_test` target. Production enablement is a separate release workflow.
- Provider calls are outside local database transactions. Protected reads remain read-only.
- No owner grants based on the first login, first provider member, Clerk Admin role, organization name or matching an existing local user by email.
- Keep the existing team invitation active-owner checks and non-null inviter invariant intact.
- No webhook is required.
- Writing this plan does not authorize live settings changes, migration application, real invitations or deployment.

## Review Focus

- CLI rerun after a lost provider response must recover the same customer/invitation, including provider pagination and duplicate matches (Tasks 2–3).
- A designated Owner with an existing Clerk account or secondary verified email must keep their local UUID and other organizations (Task 4).
- A locally cancelled/consumed grant cannot create another Owner, even if a provider request returns late or metadata changes (Tasks 3–4).
- A removed or demoted Owner must not regain privileges by replaying the old bootstrap link (Task 4).
- Bootstrap acceptance must coexist with the implemented teammate invitation flow without weakening its owner checks or depending on webhook arrival (Tasks 5–6).

## Context and implementation boundaries

The user clarified the workflow during planning: create the organization and Owner grant in Weft first, then create Clerk transport. Their earlier suggestion to use Clerk Dashboard directly and auto-create Weft organizations is superseded. Do not implement Dashboard membership-to-role synchronization or store Owner designation in Clerk private metadata.

Since the earlier plan was written, teammate invitation code has been implemented. Relevant current files include `src/modules/organizations/invitations/{repository,completion,clerk-provider,action-logic}.ts`, `src/app/accept-invitation/{page,actions}.tsx/ts`, `src/app/onboarding/page.tsx`, `src/app/access-required/page.tsx`, and `scripts/setup-clerk-organizations.ts`. Existing live verification remains pending; extending the code does not prove those provider/browser flows work.

Before coding, read AGENTS.md, ARCHITECTURE.md, the spec, current invitation code and relevant local guides in `node_modules/next/dist/docs/`. Use a separate checkout if needed. Inspect current migration journal rather than assume the next migration number. Referenced domain/engineering/ADR files absent in this repository should not be fabricated.

The plan implements initial provisioning and preserves team management as a Weft responsibility. Complete member-role editing, removal and staff/sponsor interfaces remain separate feature work. Do not expand this task into those features or claim they already exist.

## File map

| File | Responsibility |
| --- | --- |
| `src/infrastructure/database/schema/customer-provisioning.ts` | Provisioning parents and initial Owner invitation history |
| `src/modules/organizations/customer-provisioning/types.ts` | Immutable request, local states and result DTOs |
| `src/modules/organizations/customer-provisioning/validation.ts` | CLI request/config validation |
| `src/modules/organizations/customer-provisioning/repository.ts` | Database-injected local reservations, leases and atomic admission |
| `src/modules/organizations/customer-provisioning/service.ts` | Local-first create/retry/renew/cancel orchestration |
| `src/modules/organizations/customer-provisioning/clerk-provider.ts` | Provider organization creation/reconciliation; invitation transport reuse |
| `src/modules/organizations/customer-provisioning/completion.ts` | Server-only acceptance evidence and read-only discovery |
| `src/modules/organizations/invitations/admission.ts` | Dispatcher between bootstrap and teammate invitation IDs |
| `scripts/provision-customer.ts` | CLI parser, explicit configuration, connection/SDK lifecycle and sanitized output |
| `docs/backend/customer-provisioning.md` | Operator runbook, recovery and live verification record |

### Task 1: Persist customer provisioning intent and Owner invitation history

**Files:** Create schema, types, validation and repository above; modify `src/infrastructure/database/client.ts`, `drizzle.config.ts`; generate next forward migration and metadata; create `tests/customer-provisioning-validation.test.mjs`, `tests/customer-provisioning-database.test.mjs`.

**Interfaces:**
- `CustomerRequest = { requestId: string; organizationName: string; ownerEmail: string; instanceId: string; operator: string }`.
- `ProvisioningStatus = "pending" | "consumed" | "cancelled"`; `OrganizationTransportState = "queued" | "sending" | "ready" | "unknown" | "failed"`.
- `CustomerProvisioningRecord`: spec parent fields, dates as `Date`, optional IDs/timestamps as `null`. `OwnerInvitationRecord`: spec child fields, including generation-fenced leases and provider cleanup flag.
- `reserveCustomer(input: CustomerRequest, now: Date): Promise<{ provisioning: CustomerProvisioningRecord; invitation: OwnerInvitationRecord; created: boolean }>` creates organization/parent/first invitation atomically or returns the identical request. Conflicting immutable fields fail.
- `findCustomer(requestId: string, instanceId: string): Promise<CustomerProvisioningRecord | null>`; `findOwnerInvitation(invitationId: string, instanceId: string): Promise<OwnerInvitationRecord | null>`.
- Repository factory `createCustomerProvisioningRepository(database: WeftDatabase)` consumes a shared exported Drizzle database type; it must not import a global pooled connection at module initialization. Add `WeftDatabase` in `client.ts` and a type-only import so the CLI can pass its direct connection safely.

- [x] Write failing validation cases for blank/overlong name, invalid UUID, unsupported input `role`, malformed email, missing operator/config and instance mismatch. Assert trim/lowercase preserves dots/plus aliases.
- [x] Write transaction cases for one atomic reservation, concurrent identical request IDs yielding one customer, conflicting email/name denial, same-name different request IDs remaining distinct, constrained role `owner`, FK/state-field checks, and one pending invitation per parent. Assert reservation creates no user or membership. (Isolated PostgreSQL execution remains unverified.)
- [x] Run `node --test tests/customer-provisioning-validation.test.mjs` and confirm failure before implementing.
- [x] Implement the two local tables and constraints from the spec. Keep `organization_invitations` unchanged. Freeze designation on the parent; replacement invitations point to that parent rather than duplicate role/email fields. Insert all local reservation rows in one transaction, using request ID serialization and immutable conflict checks.
- [x] Run `pnpm db:generate` and inspect SQL/journal. Migration application and isolated PostgreSQL execution remain pending because no isolated test URL is configured and live schema changes are out of scope.
- [x] Run focused tests/typecheck.

### Task 2: Add reusable provider reconciliation without storing business roles

**Files:** Create bootstrap `clerk-provider.ts` and `tests/customer-provisioning-provider.test.mjs`; modify the existing invitation provider only to extract a transport factory into `src/modules/organizations/invitations/clerk-transport.ts` if needed for CLI use; preserve `clerk-provider.ts` as the server-only `clerkClient()` wrapper. Update existing provider tests and setup script imports only where extraction requires it.

**Interfaces:**
- `CustomerProvisioningProvider` supplies `findOrganization(localOrganizationId: string): Promise<{ id: string } | null>`, `createOrganization(input: { name: string; localOrganizationId: string }): Promise<{ id: string }>` and the existing invitation `send`, `findByCorrelation`, `revoke`, `readAcceptance`, `findVerifiedEmails` signatures.
- Organization correlation uses `publicMetadata.weftOrganizationId`; invitation correlation uses `publicMetadata.weftInvitationId`. No role, designated email or owner flag goes into metadata.
- Provider factory accepts an injected SDK client; use `createClerkClient` exported through the installed `@clerk/nextjs/server` SDK for the CLI and `await clerkClient()` in the app. Confirm installed exports before implementation; do not add an undeclared transitive package import or try to import server-only application modules into plain Node.

- [x] Write tests asserting local UUID correlation, omitted `createdBy`, invitation `org:member`, seven days, canonical acceptance URL and no metadata business role/email. Assert unknown/missing statuses never constitute acceptance.
- [x] Test organization and invitation pagination, zero/one/multiple exact matches, similar-name mismatch, wrong user/organization/correlation, verified email lookup, sanitized network errors and rate-limit hints.
- [x] Run provider tests and confirm new failures; then implement the focused factory extraction and bootstrap organization adapter. Preserve the existing provider error semantics and subject verification.
- [x] Run `node --test tests/customer-provisioning-provider.test.mjs tests/organization-invitation-provider.test.mjs tests/organization-auth-setup.test.mjs` plus typecheck.

### Task 3: Implement the local-first CLI with resumable external operations

**Files:** Create bootstrap service, `scripts/provision-customer.ts`, `tests/customer-provisioning-cli.test.mjs`, `tests/customer-provisioning-service.test.mjs`; extend repository/database tests and `.env.example` if present.

**Interfaces:**
- `ProvisioningResult = { requestId: string; organizationId: string | null; invitationId: string | null; status: "dry-run" | "pending" | "sent" | "unknown" | "failed" | "consumed" | "cancelled"; providerOrganizationId: string | null; providerInvitationId: string | null; cleanupPending: boolean; errorCode: string | null }`.
- `createCustomer(input: CustomerRequest, options: { apply: boolean; sendInvitation: boolean }): Promise<ProvisioningResult>`; `retryCustomer(requestId: string): Promise<ProvisioningResult>`; `renewOwnerInvitation(requestId: string): Promise<ProvisioningResult>`; `cancelCustomer(requestId: string): Promise<ProvisioningResult>`; `readCustomerStatus(requestId: string): Promise<ProvisioningResult>`.
- Repository lease operations return `{ generation: number; expiresAt: Date } | null` and require that generation on subsequent state writes. Use 60-second leases and atomic claim/update checks.
- CLI commands and inputs are exactly those in the spec. Mutation startup validates env/target before writes and rejects missing `--send-invitation` for email-capable apply commands. Dry-run is create's default. Status/cancel have no email-send option. Emit structured JSON with local/provider IDs and sanitized status; never print keys, DB URLs, tickets or provider acceptance URLs.

- [x] Write tests for default dry-run with zero writes/email, explicit mutation guards, target database/TLS checks, missing send flag, immutable request conflict, direct CLI invocation without Next runtime and closed connections on success/failure. Use injected provider/database dependencies and subprocess tests without real secrets or email.
- [x] Write service call-order assertions: organization/parent/invite commit precedes provider organization creation; mapping persistence precedes invite send; users/memberships stay empty. Duplicate create returns current state; status is read-only. Exercise crash after each external success, reconciliation before retry, stale worker fencing, pagination, duplicate correlations and unknown outcome with zero new sends.
- [x] Write cancel/renew cases: locally close invite first; failed provider cleanup denies old-link admission; consumed parent rejects cancellation/renewal; expired invite replacement reuses organization/designation and gets fresh UUID; accepted provider invite awaiting timely local completion does not renew; fresh send is blocked by unresolved provider-member/invitation conflicts. No command silently changes the Owner email.
- [x] Run focused CLI/service tests and confirm failures. Implement the bounded CLI and sequential durable orchestration. Use a direct pg pool with `DATABASE_MIGRATION_URL` and a Drizzle schema, injecting it into repository operations. Validate connection target like existing provisioning scripts; do not reuse the app's pooled `DATABASE_URL` accidentally.
- [x] Preserve known-unsent versus unknown outcomes. Catch/store sanitized external failures after local reservation; do not delete the local organization as compensation. Keep leases generation-fenced; acknowledge that fencing cannot cancel an external request already in flight, so ambiguity must fail closed.
- [x] Run focused CLI/service/provider/database cases and typecheck.

### Task 4: Grant initial ownership exactly once

**Files:** Create bootstrap `completion.ts`, `tests/customer-owner-completion.test.mjs`; extend repository/database cases. If extracting shared identity logic, add only a transaction-scoped helper in `src/infrastructure/auth/identity-provisioning.ts` and keep explicit authorization in each admission path.

**Interfaces:**
- `completeInitialOwner(input: { instanceId: string; subject: string; invitationId: string }): Promise<CompletionResult>` reuses existing `CompletionResult` type.
- `commitInitialOwner(input: { instanceId: string; invitationId: string; evidence: ProviderAcceptance }): Promise<CompletionResult>` performs the atomic parent/child/identity/membership writes.
- `discoverInitialOwnerInvitations(input: { instanceId: string; subject: string }): Promise<Array<{ invitationId: string; organizationName: string }>>` is read-only and returns proven local invitations only.

- [x] Write success tests for new account, enabled existing mapping, secondary verified email and existing memberships in other organizations. Assert role comes from immutable local `owner` intent, even if Clerk role is Member, Admin or changes. Existing profile and UUID stay unchanged.
- [x] Write rejection cases for missing local record, bare Clerk invitation/membership, wrong subject/instance/org/correlation, changed metadata, aliases, disabled mapping, cancelled/expired-before-acceptance invitation and any preexisting local member of the new customer. No email lookup may select an existing local UUID.
- [x] Write repeat/race cases: same subject completion is idempotent; different subject denied; consumed parent plus another child never grants again; demoted active membership is preserved without promotion; removed/inactive membership and disabled identity stay revoked. Timely provider acceptance may finish after local expiry. Parent cancellation/renewal and concurrent completion serialize; late delivery cannot reopen a closed record.
- [ ] Add real DB concurrency/rollback tests: two completions produce one Owner, multiple invitations for one subject across customers share one identity, identity insert failure or membership failure leaves parent/child/user state unconsumed, and subject serialization uses the same `hashtextextended(instanceId + ':' + subject, 0)` convention as existing teammate admission.
- [x] Run failing completion tests, then implement verification and transaction. Use lock order subject advisory lock → provisioning parent → invitation → existing local identity/membership. Inspect membership conflicts before creating user rows; throw/rollback on failures after writes rather than return a failure that accidentally commits partial work. Protect consumption with the locked parent and exact subject/user fields. Never make the teammate active-inviter check optional.

### Task 5: Integrate acceptance and interrupted-onboarding recovery

**Files:** Create `src/modules/organizations/invitations/admission.ts`, `tests/customer-owner-onboarding.test.mjs`; modify `src/app/accept-invitation/actions.ts`, `src/app/onboarding/page.tsx`, `src/app/access-required/page.tsx`, existing invitation route tests and recovery imports only as needed.

**Interfaces:**
- `completeConsoleInvitation(input: { instanceId: string; subject: string; invitationId: string }): Promise<CompletionResult>` looks up both local ledgers; exactly one must match. Existing team flow invokes `completeInvitation`; bootstrap invokes `completeInitialOwner`. Neither matching yields unavailable; both matching yields conflict.
- `discoverConsoleInvitations(input: { instanceId: string; subject: string }): Promise<Array<{ invitationId: string; organizationName: string }>>` combines subject-proven team/bootstrap results without swallowing provider outages as “no invitations.” Preserve a retryable discovery state in the UI if provider reads fail.
- Existing `finishInvitationWith`, completion form and selection cookie contracts remain unchanged; inject the new dispatcher into the Server Action.

- [x] Write tests for new bootstrap acceptance through the same auth route, active-session enforcement, unsigned locators, no caller-controlled role/type/subject, ambiguous UUID denial, no cookie before commit and correct invited-org selection. Assert normal teammate invitations still require local inviter and cannot fall back to bootstrap when their completion fails.
- [x] Write recovery tests for the user's preexisting Clerk account, one/multiple proven invites, wrong-account switch, expired-local/timely-provider acceptance, temporary provider/DB outage and no eligible evidence. Assert no GET/render/discovery writes and no per-user script after acceptance.
- [x] Run route/onboarding tests to confirm failures; wire the dispatcher and combined discovery. Preserve pending Clerk task handling, safe same-origin redirects, ticket URL cleanup and no-referrer behavior from existing components. Do not provision in `getCurrentUser()` or business-page guards.
- [x] Run `node --test tests/customer-owner-onboarding.test.mjs tests/invitation-onboarding-routes.test.mjs tests/console-route-auth.test.mjs tests/team-invitations.test.mjs` plus typecheck. Verify protected route inventory still rejects new unguarded business pages.

### Task 6: Verify the complete workflow and document operations

**Files:** Create `docs/backend/customer-provisioning.md`; update `docs/backend/authentication.md`, `docs/backend/invitation-onboarding.md`, earlier invitation spec's rollout note and this plan's checkboxes/status. Preserve historical test/migration records.

**Interfaces:** Produces an operator runbook and environment-specific verification record, distinguishing completed code from unverified live delivery/browser/database behavior.

- [x] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm exec next build --webpack`. Lint, typecheck, all tests (175 passed, 9 skipped), and webpack build passed. The isolated provisioning DB suite was skipped because `DATABASE_TEST_URL` is unset.
- [x] Document exact dry-run/create/status/retry/renew/cancel syntax, request-ID reuse, target credentials, output states, unknown provider outcomes, cancellation cleanup and the no-email/role-in-metadata rule. Include a UUID example and explain that only the operator runs provisioning, before the recipient accepts.
- [x] Document production as a separate release workflow rather than silently relaxing the current dev/test guard. The live checklist requires reviewed provider settings, matching instance/origin, new migration, configured restricted registration/email and authorized test delivery. No webhook or per-user post-acceptance command is needed.
- [ ] In a separately authorized development test environment, execute one CLI provisioning request and verify local-first rows/provider IDs before acceptance. Accept as a new account, then repeat with an existing account using a new customer/request ID. Verify immediate Owner dashboard access and Weft Team invitation capability without an internal operator becoming a member.
- [ ] Verify Owner invites an Organizer through Weft afterward. Changing Clerk roles, adding extra members directly in Clerk or editing metadata must not assign/change Weft roles. Repeat bootstrap link after a local demotion/removal and prove privileges are not restored. Check wrong account, required Clerk tasks, interruption, timeout recovery and cancellation/renewal races.
- [x] Update the previous runbook to replace manual first-owner bootstrap with this CLI. Explain that normal subsequent role assignments/removals remain Weft operations and their unimplemented interfaces require separate feature work. Do not present Clerk Dashboard as supported customer/team administration.
- [x] Perform final review against the spec and tests. The user prohibited subagents, so review was performed inline; resolve findings and rerun affected checks. Use `superpowers:verification-before-completion` before reporting results. Live setup and verification remain outstanding.

Local commits were not created because the current permission profile exposes `.git` as read-only. Repository files remain available for review in the working tree.

## Acceptance criteria

- One internal CLI apply command creates the customer and pending Owner intent locally, then creates Clerk transport; no intended Weft role lives in Clerk metadata.
- Recipient authentication consumes the local grant and creates active Owner membership exactly once, including existing accounts.
- Existing user UUIDs, profiles and other-organization permissions are preserved.
- A replay cannot restore removed ownership or promote a demoted member; Clerk role changes and direct Dashboard invitations grant no Weft role.
- No per-recipient operator work is required after acceptance.
- Existing teammate invitation authorization remains intact and can be used by the new Owner.
- Dry-run safety, unknown-outcome recovery, cancellation and renewal are tested with honest live-verification reporting.

## Self-review

Checked against the agreed Weft-first sequence and all spec sections. Local parent consumption closes ownership exactly once across renewed invitations; existing team inviter semantics remain separate. Generation-fenced leases cover local stale-worker writes without falsely claiming remote exactly-once API execution. All Review Focus items map to named behavioral/database/browser cases. Full team administration and production rollout are explicitly outside this bootstrap implementation rather than implied to exist.
