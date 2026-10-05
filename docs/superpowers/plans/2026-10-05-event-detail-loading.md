# Event Detail Loading Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Place the event-detail loading placeholder in the correct content column and keep primary navigation visible and interactive throughout event navigation.

**Architecture:** An Events layout owns the persistent sidebar and outer dashboard grid; pages and fallbacks own only their main content. The event skeleton shares the loaded page's responsive geometry. Keep authentication, event authorization, and organization membership checks on the server.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript, existing CSS tokens, Node's test runner.

**Spec:** This plan implements the user's request of October 5, 2026. Visual requirements come from `docs/superpowers/specs/2026-09-17-event-detail-overview-design.md`, especially Responsive Behavior, Accessibility, and Visual System. That older specification's demo persistence and authorization assumptions are superseded by the current server-backed implementation.

## Findings

- `EventDetailSkeleton` creates `.dashboard-layout` with only one child, `<main>`. The desktop grid is `200px minmax(0,1fr)` (184px at the intermediate breakpoint), so the skeleton occupies the sidebar column.
- `ConsoleSidebar` lives inside `EventsPage`, `CreateEventPage`, and `EventDetailPage`. The detail `loading.tsx` replaces the entire page, including navigation.
- The skeleton fixes hero height at 225px, whereas the loaded hero also uses aspect ratio and changes at 760px and 620px. Header, tabs, and metric dimensions also differ.
- There is no shared Events layout. The installed Next.js loading guide confirms that a segment's layout sits outside its loading boundary and stays interactive during navigation.
- This is a source-code diagnosis; browser reproduction and visual measurements are part of execution, not already completed.

## Global Constraints

- Follow existing patterns before introducing new ones.
- Keep authorization and role permissions explicit.
- Do not introduce dependencies without clear justification.
- Keep route code thin and event presentation inside the Events module.
- Reuse existing spacing, sidebar responsiveness, surfaces, focus styling, and reduced-motion rules.
- Preserve URLs, event tab behavior, API handlers, and the root Clerk provider and footer.
- Preserve unrelated working-tree changes; the repository currently contains substantial uncommitted work.

## Review Focus

1. Slow or interrupted navigation: primary navigation remains visible, clickable, and usable to leave a pending detail route.
2. Narrow screens: skeleton occupies the same content area as the final page, with no horizontal overflow.
3. Cross-organization events: shell navigation reflects the active console organization; event data still requires membership in the event's actual organization.
4. Forbidden, missing, or failed event loads: fallback content remains in the main column and reveals no protected event data.
5. Create Event completion: navigation preserves the shell even when the form creates an event in another organization the actor can manage.

## Context decision

The persistent Events sidebar represents the active console organization resolved by `requireOrganizerPageContext()`. The event detail retains its independently resolved event-specific `ConsoleContext` for event behavior and permission checks. Create Event retains its eligible-organization form context and selected organization. Neither page changes the persistent shell's organization implicitly.

This makes the sidebar stable rather than changing its organization when an event response arrives. On execution, verify multi-organization behavior explicitly; do not replace event-specific authorization with the shell's membership or silently restrict existing authorized deep links to the selected organization. Owners retain Team navigation; organizers do not receive it. Staff and sponsors gain no organizer access.

## Task 1: Put event navigation outside the loading boundary

**Files:**
- Create: `src/app/events/layout.tsx`
- Create: `src/modules/events/components/events-shell.tsx`
- Modify: `src/modules/events/components/events-page.tsx`
- Modify: `src/modules/events/components/create-event-page.tsx`
- Modify: `src/modules/events/components/event-detail-page.tsx`
- Modify: `src/modules/events/components/event-access-state.tsx`
- Modify: `src/app/events/page.tsx` and `src/app/events/new/page.tsx` if removing unused presentation props
- Test: `tests/console-shell.test.mjs`, `tests/events-page.test.mjs`, `tests/empty-pages.test.mjs`

**Interfaces:**
- `EventsShell({ context, children }: { context: ConsoleContext; children: ReactNode })` renders `.overview-shell > .dashboard-layout`, with `ConsoleSidebar active="events"` followed by route children.
- `EventsLayout({ children }: LayoutProps<"/events">)` resolves `requireOrganizerPageContext()` and returns `EventsShell`.
- Route children retain exactly one `<main>` and their existing main-content classes; they no longer own a sidebar or outer dashboard grid.

- [ ] Reproduce Events → detail, Create Event → detail, and direct detail entry with a slow response. Record the placeholder position and navigation disappearance before editing. Use development-only throttling or Suspense inspection, not a production delay.
- [x] Add shell render coverage using the existing `loadTs` and `renderToStaticMarkup` helpers: shell plus placeholder has exactly one primary navigation and one main landmark; sidebar precedes main; owner sees Team, organizer does not. Add page/fallback coverage asserting there is no nested dashboard grid or duplicate sidebar.
- [x] Run `node --test tests/console-shell.test.mjs tests/events-page.test.mjs tests/empty-pages.test.mjs`; confirm new assertions fail for the old composition.
- [x] Implement `EventsShell` and the authenticated Events layout. Keep the root layout unchanged. Do not add a template, pathname key, or loading boundary around the sidebar.
- [x] Remove outer shell/grid/sidebar markup from list, create, detail, skeleton, `MissingEvent`, and `EventAccessState`. Preserve `dashboard-main`, `event-detail-main`, and `create-event-main` on their main elements. Audit CSS selectors using `create-event-shell` and `event-detail-shell` before removing those wrappers; relocate any necessary styling without adding a nested grid.
- [x] Keep all existing page-level guards, `getEvent` authorization, event-organization checks, and mutation authorization. Remove only context props/imports that became unused for presentation. Avoid introducing cookie mutation into the layout; if existing context resolution tries to delete an invalid selection cookie during rendering, use a read-only resolution path and leave cleanup to a permitted action/handler.
- [x] Rerun the focused tests. Update assertions only for shell ownership changes; retain existing content and access assertions.
- [x] Verify in the browser that the sidebar survives list → detail and create → detail navigation, and that navigation remains interactive during loading. Entry from Overview presents navigation with no blank interval; Overview remains outside this shared Events layout.

## Task 2: Match skeleton geometry to event content

**Files:**
- Create: `src/modules/events/components/event-detail-skeleton.tsx`
- Modify: `src/modules/events/components/event-detail-page.tsx`
- Modify: `src/app/events/[eventId]/loading.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/event-detail-loading.test.mjs`

**Interfaces:**
- `EventDetailSkeleton()` is a lightweight server-compatible component returning `<main className="dashboard-main event-detail-main" aria-busy="true" aria-label="Loading event">`.
- `loading.tsx` imports it directly, avoiding the large client detail module and its roster/Kami dependencies.

- [x] Add a render test asserting one busy main region, an accessible loading label, decorative placeholders hidden from assistive technology, and no navigation or dashboard grid owned by the skeleton.
- [x] Run `node --test tests/event-detail-loading.test.mjs`; confirm failure before implementation.
- [x] Extract the skeleton into its own file and update the loading route import. Include placeholders for header, hero, tabs, four metrics, and the overview content grid so the page does not abruptly gain its entire lower structure on arrival.
- [x] Use shared geometry selectors or CSS variables for hero sizing in both states: desktop `min-height: 225px; aspect-ratio: 4.8/1`, at 760px `190px; 2.5/1`, at 620px `168px; 1.95/1`. Remove the skeleton-only fixed hero height. Apply existing radius and overflow rules at each breakpoint.
- [x] Align the header placeholder to the existing header container's minimum height, padding, and responsive stacking. Match tab padding plus tab height, metric minimum heights (desktop 92px, mobile 84px), grid gaps, and four-to-two-column behavior to the loaded content. Use existing values as the source of truth if they change before execution.
- [x] Keep shimmer confined to placeholders, preserve the reduced-motion override, and expose no fake interactive controls or invented event values.
- [ ] Run the render test and compare loading/loaded screenshots at 1440, 1024, 768, 620, and 390px. Main left edge and width must remain stable; hero bounds must match within 1px. Header text may change height for long titles, but placeholders must follow the same responsive layout rather than collapsing into a narrow column. (Loaded screenshots and DOM geometry were checked at all five responsive ranges; the loading state was captured during navigation, but a paired skeleton screenshot was not captured at every width.)

## Task 3: Verify navigation, fallback, and access behavior

**Files:** Existing test files affected above; no new test framework or production delay mechanism.

- [x] Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Run `pnpm build` after those checks pass to validate the new layout and server/client boundaries. Record any pre-existing failures separately. (Lint and typecheck pass. `pnpm test` has five unrelated failures listed below. Default Turbopack build could not run in this environment; `pnpm build --webpack` passed.)
- [x] With delayed event loading, verify Events → detail, Create Event → detail after successful creation, detail → another event, browser back/forward, direct entry, and detail-tab query changes. Confirm there is one sidebar, one main landmark, no sidebar disappearance, and no sidebar skeleton replacing already loaded navigation.
- [x] Click another primary navigation link while detail is pending. Confirm navigation interrupts the pending route and no stale event content appears afterward.
- [x] Check 1440, 1024, 768, 620, and 390px, reduced motion, and keyboard navigation. Confirm compact navigation remains visible, focus indicators work, and no horizontal page overflow appears. (Reduced-motion behavior was checked in CSS; browser OS motion preference was not toggled.)
- [ ] Verify owner and organizer accounts, signed-out redirects, absent/revoked membership, a missing event, an unauthorized event, and a failed event request with retry. Confirm fallback pages stay in the main column and protected event details never render on denial.
- [ ] Test a user belonging to two organizations: active organization A with an authorized event in B, and creation in B followed by detail navigation. Confirm the shell still identifies A while event data and operations use B's independently authorized context. Verify an unauthorized organization cannot be accessed through a direct URL.
- [x] Check Overview, Network, People, and Team links still work. This plan does not migrate those pages into the Events layout; broader cross-console shell persistence can be handled separately if requested.

## Acceptance criteria

- Event-detail loading content occupies the final page's main column, never the sidebar column.
- Primary navigation remains visible and interactive throughout event-detail transitions.
- Navigation is owned by a persistent layout rather than duplicated inside loading and loaded pages.
- Placeholder sizing follows the loaded page across desktop and mobile breakpoints.
- Loading, error, forbidden, and not-found states share the same outer composition.
- Existing event and organization authorization remains enforced, and required repository checks pass.

## Execution status

Implementation and verification complete with the limitations recorded here.

- The pre-edit slow-navigation reproduction was not recorded. After implementation, the browser showed the event loading state inside the persistent navigation shell; clicking Events while that route was pending interrupted it without stale event content.
- Browser checks covered an owner account and one available organization (`Acme Events`). This session did not expose a second eligible organization, so the A/B cross-organization scenario could not be exercised live. Source and tests confirm the shell resolves the active organization while detail authorization independently resolves the event's organization and organizer roles.
- The successful Create Event browser check created a temporary QA event in the local non-production test database (`Loading QA · 2026-10-05`). It remains in that test database because the application has no event-delete flow.
- Browser responsive checks covered the loaded page at 1440, 1024, 768, 620, and 390px viewport targets (the browser reported a narrower CSS viewport at each target); the page and hero had no horizontal overflow after the shared width rule. The skeleton was observed while navigating, but paired screenshots at every exact width were not captured.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build --webpack` passed. The exact `pnpm build` default used Turbopack and was blocked by the environment's process/port restriction after network font fetching. `pnpm test` ran 191 tests: 177 passed, 5 failed, 9 skipped. The failures are pre-existing organization-auth/select-route expectations in `tests/console-account.test.mjs` and `tests/console-authorization.test.mjs`, which conflict with unrelated dirty working-tree edits to `console-account.tsx` and `console-access.ts`, and the already deleted `src/app/select-organization/page.tsx`. The focused Events/shell/loading suite passed all 20 tests.
