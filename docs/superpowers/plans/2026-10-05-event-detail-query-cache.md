# Event Detail Query Cache Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Execute inline without subagents unless the user requests delegation. Track progress with the checkboxes below.

**Goal:** Reopening a previously loaded event shows cached details immediately, with background refresh instead of a full-page skeleton.

**Architecture:** Add an authenticated event-detail GET endpoint and an Events-scoped TanStack Query provider that persists across list/create/detail navigation. Render event details through a client query boundary, rather than waiting for the server page to read the event. Keep the existing persistent Events shell and server authorization at every protected API operation.

**Tech Stack:** Next.js 16.3.5, React 19.2.8, TypeScript, TanStack Query v5, Zod, existing Node test runner.

**Spec:** The requirements and decisions below implement the user's October 5 request for cached event revisits using React Query. Read alongside `2026-10-05-event-detail-loading.md` and the current implementation, which has already completed that earlier plan.

## Requirements and decisions

1. Show the existing `EventDetailSkeleton` only when the current event has no usable cached data and its first read is pending. Cached background refresh must preserve the event page, navigation, and user interaction.
2. Keep cached detail data in memory for **10 minutes after becoming inactive** (`gcTime: 600_000`). Mark it stale after **30 seconds** (`staleTime: 30_000`); stale reads refresh on mount, focus, and reconnect. Do not poll. Invalidation overrides freshness.
3. A fresh revisit uses cache without an event GET; a stale revisit shows cached details and performs one background GET. A hard reload, expired cache, or leaving and re-entering the Events layout may require a first-load skeleton.
4. Scope the cache to the verified local actor, Clerk session, and active console organization. Cache entries also identify the event. Do not use localStorage, IndexedDB, or a server-global QueryClient.
5. Preserve cross-organization access: active console organization A remains the sidebar context, while an authorized event in B retains its actual `organizationId` and API authorization. Cache organization scope is the active console workspace, not a claim that the event belongs to it.
6. Authentication and membership are checked on every GET and mutation. A 401, 403, or 404 must replace cached event data with a terminal state; it must never leave previously loaded guest data displayed after a definitive denial. A transient network/5xx failure may keep the last successful event visible with a concise refresh-failure notice and retry.
7. Successful creation seeds the returned full event before navigation. Successful attendee import refreshes the cached detail without `router.refresh()` and without resetting roster interaction state.
8. Event tabs share one query entry. Query keys must not include `tab`. Updating event data must not remount the detail page or replay arrival animations unnecessarily.
9. Preserve the earlier loading-layout fix: one primary sidebar, one main landmark, and the existing responsive skeleton geometry.

### Rendering decision

The detail server page continues to check the session, validate the UUID, and parse the tab; it stops awaiting `getEvent` and `requireOrganizationContext`. Those event-specific checks move to the authenticated detail API, which invokes both existing operations. The Events layout still gates organizer console entry.

Delete the detail route's unconditional `loading.tsx`; the client query boundary becomes the owner of event-data loading UI. During the short server transition Next.js may retain the previous screen until the route descriptor arrives. It must not replace a cached event with a route skeleton while server authentication is pending.

This is intentionally client-first event-detail data loading: a direct entry initially renders the shell and then fetches the event after hydration. Awaiting server prefetch/hydration on every visit would preserve the blocking transition this task needs to remove. Do not add experimental streaming adapters, global Next.js `staleTimes`, or remove authorization to optimize navigation. Server-rendered event contents are outside this implementation's scope.

### Alternatives considered

- **Recommended: Events-scoped React Query.** Explicit cached-data/background-refresh behavior and mutation invalidation, with one justified production dependency and a detail GET endpoint.
- **Next.js route-cache configuration.** Smaller change but uses an experimental page-cache setting and does not establish a reusable event-data cache for mutations.
- **Awaited server prefetch plus React Query hydration.** Preserves server-rendered event content, but the client cache remains unreachable until server navigation finishes unless an additional cache-aware route fallback is built. Avoid this added complexity for the current request.

## Global constraints

- Follow existing patterns before introducing new ones.
- Keep business logic separate from presentation logic.
- Keep authorization and role permissions explicit.
- Do not introduce dependencies without clear justification.
- Add only `@tanstack/react-query@^5` as a production dependency. Its justification is observer-driven in-memory caching, deduplication, and invalidation. Preserve unrelated package and lockfile changes.
- Read the relevant Next.js guides in `node_modules/next/dist/docs/` before editing framework integration.
- Preserve all unrelated uncommitted work. Do not commit or push without a user request.
- Keep HTTP authorization server-owned; user and organization cache keys are not proof of permission.

## Review focus

1. Server-route delay must not hide cached event content behind the old route loading fallback.
2. Definitive authorization failure during background refresh must discard old event data, unlike transient refresh failures.
3. Account/session/workspace changes and late responses must never reuse another scope's cached guest data.
4. Attendee import refresh must update every derived metric while preserving roster filters, pagination, and success feedback.
5. Different events and tabs must not mix data, duplicate requests, or overwrite a newer mutation result with an older in-flight read.

## Task 1: Add the protected event-detail read endpoint

**Files:**
- Create: `src/app/api/events/[eventId]/route.ts`
- Create: `src/infrastructure/http/get-event-handler.ts`
- Modify: `src/modules/events/event-dto.ts`
- Test: `tests/event-api.test.mjs`, `tests/event-authorization.test.mjs`

**Interfaces:**
- `eventDetailResponseSchema = z.strictObject({ data: z.strictObject({ event: eventDetailDtoSchema }) })`; make `createEventResponseSchema` reuse this same envelope without changing its public response.
- `handleGetEvent(eventId: string, dependencies = productionDependencies): Promise<Response>`, with injected `getCurrentUser`, `getEvent`, and `requireOrganizationContext` following existing handler patterns.
- `GET(request: Request, context: RouteContext<"/api/events/[eventId]">)` awaits route params and delegates to the handler; runtime is `nodejs`.

- [x] Add failing tests: anonymous is 401 without reading event data; invalid/missing UUID is 404; forbidden membership is 403; owners/organizers receive a validated DTO; the service receives the verified actor ID; response includes `Cache-Control: private, no-store`; untrusted cover URLs and unexpected failures return sanitized 500 responses.
- [x] Add a test where `getEvent` succeeds but `requireOrganizationContext` denies the event's actual organization; no DTO may be returned. Verify the role list is exactly `["owner", "organizer"]` and organization ID comes from the loaded event.
- [x] Run `node --test tests/event-api.test.mjs tests/event-authorization.test.mjs` and confirm the new endpoint assertions fail before implementation.
- [x] Implement the handler using the existing service and membership guard. Return `{ data: { event } }` on success. Reuse `errorResponse` with an event-read-specific unexpected-error message. Do not add an API that trusts client-provided actor or membership identity.
- [x] Rerun the focused tests and confirm both new read behavior and existing create/cover contracts pass.

## Task 2: Establish the cache scope and query contract

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `src/app/events/layout.tsx`
- Create: `src/modules/events/components/events-query-provider.tsx`
- Create: `src/modules/events/queries/event-detail-query.ts`
- Create: `src/modules/events/queries/fetch-event-detail.ts`
- Create: `tests/event-detail-query.test.mjs`
- Test: `tests/console-shell.test.mjs`

**Interfaces:**
- `EventQueryScope = { actorId: string; activeOrganizationId: string; sessionId: string }`.
- `EventDetailQueryResult = { kind: "ready"; event: EventDetailDto } | { kind: "unauthorized" | "forbidden" | "not-found" }`.
- `eventDetailKey(scope: EventQueryScope, eventId: string)` returns the readonly tuple `["events", "detail", scope.actorId, scope.sessionId, scope.activeOrganizationId, eventId]`.
- `fetchEventDetail(eventId: string, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<EventDetailQueryResult>`.
- `eventDetailQueryOptions(scope: EventQueryScope, eventId: string)` produces the shared options used by the detail boundary and cache updates.
- `EventsQueryProvider({ context, clerkSubject, children }: { context: ConsoleContext; clerkSubject: string; children: ReactNode })` supplies the stable QueryClient and `useEventQueryScope()`.

- [x] Install TanStack Query v5 with pnpm. Read its current official defaults, cancellation, and query-options documentation before implementation.
- [x] Add tests using actual `QueryClient` and `QueryObserver`, deferred promises, and controllable timestamps: fresh cache reuse makes no request; stale mount synchronously exposes cached data while fetching; simultaneous observers deduplicate; tab selection uses the same key; event/user/session/workspace changes use different keys; abort cancels the read; garbage collection respects the configured duration.
- [x] Add client-fetch tests: credentials are `same-origin`, browser HTTP cache is `no-store`, AbortSignal is forwarded, schema validation rejects mismatched event IDs, malformed success responses are errors, and aborted requests retain their cancellation semantics rather than becoming generic API failures.
- [x] Map 401/403/404 responses to terminal query results. They overwrite the previous `ready` result and remove its DTO from the entry; they are not retryable exceptions. Test denial after a successful cached read. Network/5xx/invalid-response errors remain typed `ApplicationError` failures and preserve the previous successful result.
- [x] Implement shared options: `staleTime: 30_000`, `gcTime: 600_000`, `refetchOnMount: true`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`, `networkMode: "always"`, and no interval. The explicit network mode allows an offline first read to fail with feedback rather than remain indefinitely paused behind a skeleton. Allow one retry for transient failures; do not retry cancellation or terminal results. No previous-event `placeholderData`.
- [x] In the Events layout, obtain the verified Clerk subject through `requireClerkSession()` and pass it with the organizer context. Mount the provider around `EventsShell`, outside page/loading/error boundaries.
- [x] Use live Clerk `useAuth()` with pending sessions treated as signed out. Render cached children only when loaded, signed in, and the live subject matches `clerkSubject`; derive the session scope from the live session ID. Key the inner provider by actor, session, and active organization. A scope change unmounts the old client immediately; cleanup cancels its queries and clears it. Create one QueryClient per mounted scope, never per page/render or in a server-global singleton.
- [ ] Test provider scope behavior in the browser: list/detail/back preserves the client, route refresh with unchanged scope preserves it, and account/session/workspace changes hide old content before the new context resolves. Verify an old request resolving after scope change cannot populate the new client.
- [x] Run `node --test tests/event-detail-query.test.mjs tests/console-shell.test.mjs`.

## Task 3: Render cached details through the query boundary

**Files:**
- Create: `src/modules/events/components/event-detail-query-page.tsx`
- Modify: `src/app/events/[eventId]/page.tsx`
- Delete: `src/app/events/[eventId]/loading.tsx`
- Modify: `src/modules/events/components/event-detail-page.tsx`
- Modify: `src/app/globals.css` only for a compact refresh-error notice if existing styles cannot be reused
- Test: `tests/event-detail-loading.test.mjs`, `tests/console-route-auth.test.mjs`, `tests/event-detail-query.test.mjs`

**Interfaces:**
- `EventDetailQueryPage({ eventId, initialTab }: { eventId: string; initialTab: EventDetailTab })` consumes `useEventQueryScope()` and shared query options.
- Extend `EventDetailPage` props with `onImportSaved: () => Promise<void>` and optional `refreshNotice: ReactNode`; retain `event` and `initialTab`.
- Place any notice inside the page's existing main landmark, never in a sibling main or duplicated shell.

- [x] Add state coverage: empty pending cache renders skeleton; cached pending refresh renders event; ready empty-attendee data renders normal event; terminal results show access/sign-in/not-found UI; transient failure without cache shows retry; transient failure with cache retains details with `Could not refresh event. Showing the last loaded details.` and a `Try again` action.
- [x] Make the server route await the session and route inputs, validate the UUID, parse `initialTab`, and return `EventDetailQueryPage`. Remove server event reads and event-specific membership queries from this page; they now run in Task 1's handler. Retain the existing server session guard and metadata.
- [x] Delete the unconditional route loading file. Retain `EventDetailSkeleton` for the query boundary and `not-found.tsx` for malformed UUIDs. API 404 results render the existing missing-event presentation client-side; document that these do not change an already streamed document's HTTP status.
- [x] Use non-Suspense `useQuery`; the presence of usable data, not `isFetching` or `isPending` alone, determines whether to show the full skeleton. Render terminal results before any cached event presentation. On unauthorized result, cancel/clear the scope, gate protected content, and navigate to sign-in without carrying cached details to another account.
- [x] Keep presentation mounted across refetches. Do not key it by timestamps or query status. Preserve existing tab navigation/reset semantics without making a new query key per tab. Pass the latest DTO to the roster and metrics; do not copy it into separate component state.
- [x] Rerun the focused tests, including the existing per-page session guard test. Do not weaken that test to accommodate the new route.
- [ ] In a production build, delay GET responses and verify fresh/stale event revisits, browser Back/Forward, Events breadcrumb navigation, tab changes, and interrupted event loads. Confirm cached revisits never display the route or data skeleton and no duplicate sidebar/main appears.

## Task 4: Seed and invalidate data after mutations

**Files:**
- Modify: `src/modules/events/components/create-event-page.tsx`
- Modify: `src/modules/events/components/event-detail-query-page.tsx`
- Modify: `src/modules/events/components/event-detail-page.tsx`
- Modify: `src/modules/events/queries/event-detail-query.ts`
- Test: `tests/event-detail-query.test.mjs`, `tests/event-create-client.test.mjs`, `tests/attendee-import-client.test.mjs`

**Interfaces:**
- `seedEventDetail(queryClient: QueryClient, scope: EventQueryScope, event: EventDetailDto): void` stores `{ kind: "ready", event }` under the exact event key.
- `refreshEventDetail(queryClient: QueryClient, scope: EventQueryScope, eventId: string): Promise<void>` invalidates/refetches the exact entry, propagates refresh failures, and treats terminal read results as refresh failures for import feedback.

- [x] Test that creation seeds the full validated response before `router.push`, using the provider's active scope even if the created event belongs to another authorized organization. A revisit observes the seeded data without a first-read skeleton; failed creation does not seed anything.
- [x] Implement cache seeding immediately after `submitCreateEvent` resolves and before navigation. Preserve existing validation, guard, and failure handling.
- [x] Test import invalidation with a delayed pre-import GET: cancel it before starting the replacement read so it cannot restore old guest counts after import. Verify guest rows, total/VIP/sponsor counts, import history, readiness, and activity derive from the refreshed DTO.
- [x] Implement `refreshEventDetail`: await cancellation of the exact detail query, call `invalidateQueries({ queryKey, exact: true, refetchType: "active" }, { throwOnError: true })`, and inspect its result for terminal denial. Keep cached content visible during this refresh. Use the callback from `EventDetailQueryPage` in `AttendeeRoster` in place of `router.refresh()`.
- [x] Preserve `refreshAfterImport(onSaved)` behavior: an import that saved successfully but failed to refresh keeps the successful-save feedback and reports refresh failure. It must not resubmit the CSV. Do not invent guest IDs or fabricate an optimistic full roster from import counts.
- [x] Remove now-unused `useRouter` code from `EventDetailPage` if import refresh was its only use. Preserve its copy-link behavior and all other interaction state.
- [x] Verify roster search/filter/sort state remains intact during successful refresh, pagination clamps if necessary, and navigating away then returning uses the updated entry. The server-backed Events list continues fetching its own summaries on navigation; migrating list data to React Query is outside scope.
- [x] Run `node --test tests/event-detail-query.test.mjs tests/event-create-client.test.mjs tests/attendee-import-client.test.mjs`.

## Task 5: Complete integration verification

- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, then `pnpm build`. Separate pre-existing failures from regressions introduced here. Update existing source/render tests to the new data-loading ownership without dropping authorization coverage.
- [ ] Verify `pnpm start` behavior as well as development mode; prefetch/navigation differ between them. Record event GET counts: one on uncached entry, zero on fresh revisit, one background request on stale revisit, one replacement read after successful import.
- [x] Verify cache expiration with controllable test timers. A hard reload and Events-layout unmount can start empty; do not promise cache persistence outside the mounted Events scope.
- [ ] Exercise two events and all event tabs, including switching events while a request is delayed. Never display event A's data under event B's URL. Existing pending-request cancellation must still permit later retries and revisits.
- [ ] Exercise owner, organizer, staff, sponsor, revoked membership, signed-out/pending session, account switch, and active organization change. Validate no read/mutation bypass and no stale event DTO after a definitive 401/403/404. Test permitted cross-organization event access separately from denied access.
- [ ] Exercise offline/5xx refresh with and without a cached event, retry, reconnect, and window focus. Cached failures retain the last successful DTO with clear feedback; an offline first visit reports failure rather than spinning forever.
- [ ] Inspect 1440, 1024, 768, 620, and 390px, reduced motion, keyboard focus, and live status feedback. Preserve one main landmark, persistent navigation, skeleton placement, and no horizontal overflow.
- [x] Update this plan's checkboxes and report files changed, completed checks, request-count evidence, and any remaining limitations. Do not commit or push.

## References

- Installed Next.js guides: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`, `layout.md`, and `01-app/01-getting-started/04-linking-and-navigating.md`.
- [TanStack Query defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults): freshness and inactive retention are separate; configure both deliberately.
- [TanStack Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation): consume the query's AbortSignal so scope changes and invalidation can cancel pending reads.
- [TanStack Query server rendering](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr): reference for provider boundaries and the server-prefetch alternative considered above.
- [Clerk useAuth](https://clerk.com/docs/reference/hooks/use-auth): verify live identity/session and pending-session handling against the installed SDK during execution.

## Status

Tasks 1–4 are implemented. Query-client tests prove zero requests for a fresh revisit, one deduplicated background read for a stale revisit, cancellation before replacement refresh, and ten-minute retention. Production build and server start were verified; browser detail navigation/request counts and responsive manual checks remain incomplete because the production origin redirected to Clerk sign-in. The full suite reports 197 passing, 5 failing, and 9 skipped; its five console authorization/organization-selection failures match the baseline. `pnpm build` with default Turbopack could not start workers in the restricted environment; `pnpm exec next build --webpack` completed successfully. No commit or push was made.
