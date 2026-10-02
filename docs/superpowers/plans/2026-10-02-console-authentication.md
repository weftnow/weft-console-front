# Console Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:subagent-driven-development only if the user explicitly selects delegation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require an active Clerk session throughout the Console and authorize existing functionality using Neon users and organization memberships.

**Architecture:** Clerk verifies sessions and enforces invitation-only registration. An explicit identity mapping resolves Clerk subjects to existing Weft UUID users; Neon memberships govern capabilities. Server checks run at every page and protected read/mutation boundary, while shared account UI receives safe context DTOs.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, `@clerk/nextjs` 7.9.10, Drizzle, PostgreSQL/Neon, Zod, pnpm 10.10.0, existing Node test runner.

**Spec:** [Console authentication design](../specs/2026-10-02-console-authentication-design.md), proposed for review alongside this plan.

## Global Constraints

- Preserve local UUID user IDs and existing event creator/import references.
- Clerk development app `app_3K9Cnx185cBaBgyMM441dY68SQ9` uses `sign_up_mode = restricted`; invitation acceptance grants no Weft role.
- Keep roles and active membership authoritative in Neon. Never auto-link by email, auto-promote the first user, or trust actor/role fields from the browser.
- Use pnpm for all package commands; no new runtime dependencies are planned.
- Read local Next.js guides and installed SDK types before coding; `auth()` and `cookies()` are asynchronous. Do not use deprecated Clerk `createRouteMatcher()`.
- No environment file contents, keys, tokens, raw database connection URLs, or attendee contact records in logs or documentation.
- Runtime: pooled Neon `dev/weft_console_test`; development migration/provisioning: direct connection to that database. Production rollout is separate.
- Protect fixture pages but label them as demo data. Full dashboard data conversion and custom auth branding are deferred.
- No invitation emails or production changes during implementation without separate explicit authorization.

## Review Focus

1. RSC, prefetch, and direct nested-route requests must not bypass checks or contain dashboard payloads when signed out (Task 1 and final browser validation).
2. A valid Clerk account without mapping/membership must receive an access state or API 403, never organizer access (Tasks 2–4).
3. A stale/forged organization cookie or membership revoked after login must not reveal another organization (Tasks 3–4).
4. Concurrent provisioning, attempted identity reassignment, and mismatched instance configuration must fail safely (Task 2).
5. Logout/account switching and database outages must not reuse another user's context or fall back to public demo views (Tasks 4–6).

---

### Task 1: Require sign-in before any dashboard render

**Files**

- Create: `src/infrastructure/auth/require-session.ts`, `tests/console-route-auth.test.mjs`.
- Modify: `src/app/page.tsx`, `src/app/events/page.tsx`, `src/app/events/new/page.tsx`, `src/app/events/[eventId]/page.tsx`, `src/app/network/page.tsx`, `src/app/people/page.tsx`, `src/app/partner-report/page.tsx`.
- Review: `src/proxy.ts`, `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, installed Clerk server auth declarations.

**Interfaces**

- Produces `requireClerkSession(): Promise<{ subject: string }>` using server-only `await auth()`; only an authenticated active session returns. Otherwise invoke Clerk's supported server sign-in redirect helper.
- The root route is a protected application page, never a public landing page. Authentication pages and assets remain public.

- [ ] Add guard tests with a stubbed Clerk adapter: anonymous and pending sessions redirect; active sessions resolve the verified subject; caller-provided identifiers cannot override it.
- [ ] Add a route-inventory regression assertion that every business `page.tsx` calls the required server guard before rendering/querying a dashboard. Public exceptions are the sign-in and invitation acceptance route trees; later access and selector routes must check Clerk themselves.
- [ ] Run `node --test tests/console-route-auth.test.mjs`; confirm the current unguarded routes fail the assertions.
- [ ] Implement the session guard and call it first in every current dashboard route, including the root. Do not rely on a layout or client component to protect child routes.
- [ ] Preserve the Proxy matcher, including API/TRPC and `/__clerk/:path*`; do not add Neon queries to Proxy.
- [ ] Run the focused tests and `pnpm typecheck`; anonymous pages must never invoke their dashboard render functions.
- [ ] Commit only the Clerk scaffold and Task 1 source/test files after reviewing the diff, excluding `.env.local` and unrelated changes.

### Task 2: Resolve verified Clerk identities through Neon

**Files**

- Modify: `src/infrastructure/database/schema/identity.ts`, `src/infrastructure/auth/current-user.ts`, `tests/event-auth.test.mjs`.
- Create: `src/infrastructure/auth/identity-repository.ts`, `src/infrastructure/auth/resolve-current-user.ts`, `scripts/provision-clerk-user.ts`, `tests/clerk-identity.test.mjs`, `tests/clerk-identity-database.test.mjs`, `docs/backend/authentication.md`.
- Generate: `drizzle/0002_clerk_user_identities.sql` and matching snapshot/journal metadata (use the next free number if another migration appears before execution).

**Interfaces**

- Preserve `AuthenticatedUser = { id: string; displayName: string; avatarUrl: string | null }` and `getCurrentUser(): Promise<AuthenticatedUser | null>`.
- Produce `findClerkUser(input: { instanceId: string; subject: string }): Promise<AuthenticatedUser | null>`: query an enabled identity joined to its existing local user.
- Produce `resolveCurrentUser(deps: { readSession: () => Promise<{ subject: string } | null>; instanceId: string | undefined; findUser: typeof findClerkUser }): Promise<AuthenticatedUser | null>` for independent unit tests; missing mapping throws `ApplicationError("FORBIDDEN", ...)`.
- Configure server-only `WEFT_CLERK_INSTANCE_ID`; SDK keys verify the session, deployment config scopes the mapping.

- [ ] Replace the existing placeholder-auth test with adapter tests: signed-out/pending returns null without querying Neon; active mapped subject resolves the local UUID; missing/disabled mapping throws FORBIDDEN; missing config and database failures propagate safely; a mapping from another instance does not resolve.
- [ ] Run `node --test tests/event-auth.test.mjs tests/clerk-identity.test.mjs` and establish the failing baseline without live provider calls.
- [ ] Define the mapping table and constraints from the spec, generate the forward migration with `pnpm db:generate --name=clerk_user_identities`, and inspect SQL and metadata. Preserve previous migrations byte-for-byte.
- [ ] Implement the repository/resolver and wire `getCurrentUser()` to the installed Clerk server API. Memoize only within the current React server render; do not persist tokens or create users during reads.
- [ ] Implement provisioning arguments: `--instance-id`, `--clerk-user-id`, and either `--local-user-id` or `--display-name` with optional `--avatar-url`. Validate exclusive modes, UUID/Clerk identifier formats, and explicit development/test target. Use one transaction; an exact existing mapping is repeatable, conflicts are rejected, and existing users are never silently reassigned. Output only the local UUID and operation outcome.
- [ ] Add isolated database cases for identity uniqueness, concurrent same-identity provisioning, disabled identities, different instances, foreign keys, and conflict rollback. No test resets the shared development database.
- [ ] Inspect the development schema/journal read-only, then apply the reviewed migration with the direct Neon development connection using the existing migration script. Verify a repeated migration invocation is a no-op.
- [ ] Run focused unit tests and the explicitly enabled database cases while app/preview usage is stopped. Document administrative invitation → account acceptance → explicit local mapping → membership provisioning. Execute no invitations as part of this task.
- [ ] Commit identity code, migration metadata, script, tests, and documentation.

### Task 3: Add organization selection and capability checks

**Files**

- Modify: `src/modules/organizations/types.ts`, `src/modules/organizations/repository.ts`, `src/modules/organizations/service.ts`.
- Create: `src/modules/organizations/console-access.ts`, `src/infrastructure/auth/console-page-context.ts`, `src/app/select-organization/page.tsx`, `src/app/select-organization/actions.ts`, `src/app/access-required/page.tsx`, `tests/console-authorization.test.mjs`.

**Interfaces**

- Produce `listActiveMemberships(userId: string): Promise<Membership[]>` with organization names for this user only.
- Produce `ConsoleContext = { user: AuthenticatedUser; organization: { id: string; name: string }; membership: { id: string; role: OrganizationRole } }`.
- Produce `resolveConsoleAccess(input: { memberships: Membership[]; selectedOrganizationId: string | null }): { kind: "ready"; membership: Membership } | { kind: "select" } | { kind: "no-access" }`; reject a stale selection, auto-select only when exactly one active membership remains.
- Produce `requireOrganizerPageContext(): Promise<ConsoleContext>`: Clerk/local actor resolution, fresh active membership lookup, validated selection, owner/organizer role check. Other roles get an access state, not a role promotion.
- Produce `requireOrganizationContext(input: { user: AuthenticatedUser; organizationId: string; allowedRoles: OrganizationRole[] }): Promise<ConsoleContext>` using a fresh `findMembership` lookup. This is the resource-specific context operation used after Event Detail authorization; forbidden membership throws the existing FORBIDDEN application error.
- Produce `selectOrganization(formData: FormData): Promise<void>` as a server action; it verifies the actor, UUID and membership before writing the `weft_organization_id` cookie and redirecting to `/`.

- [ ] Add table-driven tests for each role, no memberships, inactive memberships, one/multiple organizations, a forged/stale cookie, cross-user membership data, and revocation between requests. Assert no unrelated organization name/ID is returned.
- [ ] Run `node --test tests/console-authorization.test.mjs` before implementation to confirm the missing behavior.
- [ ] Implement pure selection/capability logic in the organizations module and thin Next.js redirect/cookie integration in the page-context file. Only owner and organizer roles enter the organizer Console.
- [ ] Build the selector using only the actor's active memberships. Recheck membership in its action; store JSON `{ userId, organizationId }` in the `weft_organization_id` cookie with HttpOnly, SameSite=Lax, path `/`, Secure in production. Parse and validate both UUIDs and match the cookie user to the verified actor; mismatch clears the cookie. Cookie contents are selection hints, never authorization claims.
- [ ] Build `/access-required` as a neutral account screen with logout, refresh, and safe organization switching when applicable. Check Clerk directly so unprovisioned users do not enter a redirect loop. Do not render the full Console or show provider IDs as product copy.
- [ ] Test that missing local mapping routes to this page, pending sessions go to sign-in, and infrastructure errors remain generic errors rather than access/demo fallbacks.
- [ ] Run focused tests and `pnpm typecheck`; commit the access policy and selectors.

### Task 4: Apply Neon authorization to the dashboard and existing operations

**Files**

- Modify: all dashboard page routes from Task 1; `src/infrastructure/http/create-event-handler.ts`, `src/infrastructure/http/get-event-cover-handler.ts`, `src/infrastructure/http/import-attendees-handler.ts` only where integration requires changes.
- Review: `src/modules/events/server/service.ts`, `src/modules/events/server/attendee-import-service.ts`, `src/modules/events/server/attendee-import-repository.ts`.
- Modify tests: `tests/event-api.test.mjs`, `tests/attendee-import-api.test.mjs`, `tests/event-authorization.test.mjs`.
- Create: `tests/console-pages.test.mjs`.

**Interfaces**

- General organizer pages consume `requireOrganizerPageContext()` before importing/rendering sensitive view data.
- Event-resource pages use the local actor and their existing resource membership checks; an organization cookie cannot authorize a foreign event.
- API handlers continue consuming `getCurrentUser()` and return the existing JSON envelope: null actor → 401; FORBIDDEN mapping/membership → 403.

- [ ] Add denied-render tests for root/Events/Network/People, mapped users with no membership, and staff/sponsor roles. Assert the dashboard component and data reader are never called on denial.
- [ ] Add API tests for unprovisioned/disabled accounts and cross-organization create/import/cover requests. Preserve authorization-before-body-parsing and existing transaction rechecks.
- [ ] Run focused page/API tests and confirm the current implementations fail the new cases.
- [ ] Replace Task 1's session-only check on general organizer pages with the complete context guard. For Create Event, retain all authorized organization options and recheck the submitted UUID; selected context may provide a default only.
- [ ] Integrate session/local actor handling into Event Detail; retain event-derived permission checks, NOT_FOUND behavior and safe access states. After `getEvent` succeeds, use Task 3's `requireOrganizationContext` with its `organizationId` and allowed roles `["owner", "organizer"]` for the displayed context rather than a conflicting cookie. Reuse controlled access states if membership is revoked between those reads.
- [ ] For `/partner-report`, require the session and return a neutral unavailable report state. Do not render unscoped sponsor fixtures until a sponsor participation authorization model exists.
- [ ] Preserve current creation, cover delivery, CSV import/replay, body-size/origin checks, and locking semantics. Missing mapping uses the existing controlled 403 path; sanitized infrastructure errors return 500.
- [ ] Run `node --test tests/event-api.test.mjs tests/attendee-import-api.test.mjs tests/event-authorization.test.mjs tests/console-pages.test.mjs`; commit route integration.

### Task 5: Connect account controls and safe dashboard context

**Files**

- Modify: `src/shared/ui/console-sidebar.tsx`, `src/modules/insights/components/organizer-overview.tsx`, `src/modules/events/components/events-page.tsx`, `src/modules/network/components/network-page.tsx`, `src/modules/attendees/components/people-page.tsx`, `src/modules/events/components/create-event-page.tsx`, `src/modules/events/components/event-detail-page.tsx`, `src/modules/events/components/event-access-state.tsx`, `src/app/globals.css`.
- Create: `src/shared/ui/console-account.tsx`, `src/shared/ui/demo-data-notice.tsx`, `tests/console-account.test.mjs`.
- Create: `src/app/account/actions.ts` containing `clearOrganizationSelection(): Promise<void>`; this deletes the selection cookie before the app's explicit logout control calls Clerk sign-out.
- Modify: auth route pages/provider configuration only as needed for safe fallback destinations.

**Interfaces**

- Pass `ConsoleContext` (or its safe display subset) from protected server routes to views/sidebar; no Clerk session tokens, raw membership lists, or secrets in browser DTOs.
- `ConsoleAccount` is the small Clerk client boundary for `UserButton`/logout; the organization name and local role come from the server.
- `DemoDataNotice` explicitly identifies fixture content; it must not imply that fixture metrics/people/events belong to the selected organization.

- [ ] Add rendering tests for the real local name/role/organization, supported navigation, no hardcoded Nick/Organizer fallback, and a demo notice on each fixture page.
- [ ] Run `node --test tests/console-account.test.mjs` and confirm the old sidebar fails.
- [ ] Thread context through the existing server/client boundaries. Keep module presentation inside its module; do not duplicate page layouts merely to carry auth props.
- [ ] Replace the mock profile with account/logout controls; add safe organization switching. Preserve the established design tokens and defer custom Clerk branding.
- [ ] Display truthful demo notices on Overview, Events listing, Network and People. Keep the live Event Detail/Create/import surfaces distinct from fixture summaries.
- [ ] Configure sign-in/sign-up fallback navigation to `/`, preserve supported same-origin deep links, and sign-out navigation to `/sign-in`. Remove forced redirects that would discard the requested event destination.
- [ ] Wire an explicit logout control to await `clearOrganizationSelection()` and then the installed Clerk client `signOut({ redirectUrl: "/sign-in" })`. Clerk's account menu may also sign out; the user-bound cookie must be rejected on account changes even when that path bypasses the app's cleanup action. Reset user-specific client state and force a fresh server context on switch. Do not rely on stale client navigation state after revocation.
- [ ] Run focused rendering tests and `pnpm typecheck`; commit the account UI.

### Task 6: Verify complete access flows and document rollout

**Files**

- Modify: `.env.example`, `docs/backend/authentication.md`, `docs/backend/create-event.md`, `docs/backend/attendee-imports.md`.
- Update: route-inventory tests for all new routes and public exceptions.
- Review: `src/proxy.ts`, `src/app/layout.tsx`, all new auth/context files and generated migration.

- [ ] Document nonsecret environment variable names, Clerk instance pairing, pooled/direct Neon usage, provisioning commands, mapping disable/revocation, and the fact that authentication does not convert fixture dashboards into live analytics.
- [ ] Replace obsolete documentation saying the adapter is unconfigured. Document application invitation acceptance separately from local organization authorization.
- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Record skipped live database tests explicitly; enable those only against an isolated/safe development target with competing app usage stopped.
- [ ] Run host `clerk doctor --json` and verify the development access mode remains `restricted`, without printing keys. Prefer the installed CLI or `pnpm dlx clerk@latest`; do not run `clerk init` again.
- [ ] In a signed-out browser, visit `/`, `/events`, `/events/new`, an event deep link with a tab query, `/network`, `/people`, and `/partner-report`: all lead to sign-in with no protected page payload. Exercise RSC/prefetch requests and query/path variants. Auth routes and assets must still load.
- [ ] With an explicitly invited, provisioned owner/organizer, verify login, root, organization selection, existing event creation, persisted detail, protected cover, CSV import and exact replay. A created event may still be absent from the fixture listing; do not represent that existing limitation as a new auth failure.
- [ ] Verify an invited but unmapped user, no-membership user, inactive membership, staff and sponsor memberships, forged cookie, and a cross-organization event/API request. None may enter organizer views through direct URLs.
- [ ] Verify logout, browser back/refresh, account switch, session expiry, pending session tasks, membership/mapping revocation while signed in, and a controlled Neon outage. Fresh protected requests must fail closed and API errors must retain JSON status/envelope semantics.
- [ ] Review the diff for unguarded new routes, provider IDs trusted from browser input, global caches, token leakage, accidental production targeting, fixture exposure, and changed import transaction semantics.
- [ ] Record actual verification results in the backend documentation and commit the final documentation/check changes. Do not deploy or send invitations as part of this plan.

## Completion criteria

- Signed-out visitors cannot render the root or any dashboard page, including deep links and RSC/prefetch requests.
- Invitation-only registration is preserved; active Clerk sessions resolve explicitly linked Neon users.
- Organizer access depends on fresh active Neon membership; staff, sponsors and unprovisioned accounts cannot bypass it.
- Existing Create Event, Event Detail, cover and CSV workflows work with real local UUID actors and retain their permission checks.
- Account UI uses authenticated identity and organization context; fixtures are visibly labeled and never silently represented as live tenant data.
- Migration, provisioning, tests and development acceptance are documented. Production setup/deployment remain a separate release.
