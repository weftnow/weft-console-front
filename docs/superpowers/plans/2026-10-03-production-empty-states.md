# Production Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every piece of hardcoded demo data from the Weft Console, show real events where a data source exists, and show on-brand empty states everywhere else.

**Architecture:** One shared `EmptyState` component in `src/shared/ui`. A new `listEvents` read path (repository → service → Server Component route) feeds `/events` and `/`. Every App Router page resolves the viewer with `getCurrentUser()` and passes it to `ConsoleSidebar`. People, Network and Partner report pages render a header plus an empty state; their mock data and the presentational components bound to it are deleted.

**Tech Stack:** Next.js 16.3.5 App Router (Server Components), React 19, TypeScript, Drizzle ORM on Neon Postgres, `node:test` with `tests/load-ts.mjs` and `react-dom/server`.

**Spec:** `docs/superpowers/specs/2026-10-03-production-empty-states-design.md`

## Global Constraints

- No fictional people, companies, numbers, events or tenant branding ("WE ARE ONE", "Nick", "Horizon Family Office") anywhere under `src/` or `public/`.
- Branding: Weft wordmark; brand story line "The networking layer for business events."; footers "Powered by Weft".
- Design: reuse existing tokens only (`--weft-surface-inset`, `--weft-shadow-inset*`, `--weft-text-muted`, `--weft-radius-*`); at most one orange primary action per empty state; no new shadows or radii; 10px type floor.
- Empty-state copy is exactly the spec's table (section 4).
- Pages with no data render only the header and the empty state; no zeroed metrics or empty charts.
- Permission rule for event reads: active `owner` or `organizer` membership only.
- No sample-data fallback on any error path.
- Keep markup asserted by `tests/inset-depth.test.mjs`: `nav-link--active surface-pressed` in the sidebar; `className="metric__icon" depth="inset"` and `<tbody className="table-body-well" data-depth="inset">` in `organizer-overview.tsx`; `className="radial-track"` in `repeat-attendance-chart.tsx`; all CSS rules it checks stay in `globals.css`.
- Do not edit `next.config.ts`, add dependencies, or touch the database schema.
- Run commands from the repo root. `pnpm test` runs `node --test tests/*.test.mjs && pnpm typecheck`.

## Review Focus

1. **A protected cover URL rendered through `next/image` optimization** — the optimizer fetches without the viewer's session and would 401; covers must render with `unoptimized`. Pinned in Task 4 (`eventArt` + `CityArtwork` test).
2. **An event whose `startsAt`/`endsAt` straddle "now"** — must be `live`, and boundaries must match `deriveScheduleStatus`. Pinned in Task 3 (`groupEvents` boundary test).
3. **A staff or sponsor member, or an inactive organizer, listing events** — must see none of the organization's events. Pinned in Task 3 (database test).
4. **A user with zero events** — Overview and Events must show the "No events yet" page state, not empty panels or "0" metrics. Pinned in Tasks 4 and 5 (render tests).
5. **An event with no guests in the Kami preview** — must fall back to generic suggestions without crashing or showing a named person. Pinned in Task 7.

---

### Task 1: Shared `EmptyState` component

**Files:**
- Create: `src/shared/ui/empty-state.tsx`
- Modify: `src/app/globals.css` (rename `.roster-empty*` rules at lines 1372-1376 to `.empty-state*`, add the `--page` and `--panel` modifiers)
- Modify: `src/modules/events/components/attendee-roster.tsx:68-87` and the three `RosterEmpty` usages (~L214-228)
- Test: `tests/empty-state.test.mjs`

**Interfaces:**
- Produces: `EmptyState({ icon, title, description?, action?, size? })` where `icon: ComponentType<SVGProps<SVGSVGElement>>`, `title: string`, `description?: string`, `action?: ReactNode`, `size?: "page" | "panel"` (default `"page"`). Renders `<div className="empty-state empty-state--{size}">`.

- [ ] **Step 1: Write the failing test**

```js
// tests/empty-state.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

test("empty state renders an inset icon well, title, description and one action", () => {
  const { EmptyState } = loadTs("src/shared/ui/empty-state.tsx");
  const { CalendarIcon } = loadTs("src/shared/ui/icons.tsx");
  const html = renderToStaticMarkup(React.createElement(EmptyState, {
    icon: CalendarIcon, title: "No events yet",
    description: "Create your first event to start measuring networking outcomes.",
    action: React.createElement("a", { href: "/events/new" }, "Create event"),
  }));
  assert.match(html, /class="empty-state empty-state--page"/);
  assert.match(html, /class="empty-state__icon surface-inset"/);
  assert.match(html, /<h2>No events yet<\/h2>/);
  assert.match(html, /<p>Create your first event to start measuring networking outcomes\.<\/p>/);
  assert.match(html, /<a href="\/events\/new">Create event<\/a>/);
});

test("panel empty state is compact and may omit description and action", () => {
  const { EmptyState } = loadTs("src/shared/ui/empty-state.tsx");
  const { CalendarIcon } = loadTs("src/shared/ui/icons.tsx");
  const html = renderToStaticMarkup(React.createElement(EmptyState, { icon: CalendarIcon, title: "No live events right now", size: "panel" }));
  assert.match(html, /class="empty-state empty-state--panel"/);
  assert.match(html, /<h3>No live events right now<\/h3>/);
  assert.doesNotMatch(html, /<p>/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/empty-state.test.mjs`
Expected: FAIL (cannot find `src/shared/ui/empty-state.tsx`).

- [ ] **Step 3: Implement the component**

```tsx
// src/shared/ui/empty-state.tsx
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Surface } from "./surface";

export function EmptyState({
  action,
  description,
  icon: Icon,
  size = "page",
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  size?: "page" | "panel";
  title: string;
}) {
  const Heading = size === "page" ? "h2" : "h3";
  return (
    <div className={`empty-state empty-state--${size}`}>
      <Surface className="empty-state__icon" depth="inset"><Icon height="22" width="22" /></Surface>
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
```

Replace `globals.css` lines 1372-1376 with:

```css
.empty-state { display: grid; align-content: center; justify-items: center; padding: 30px; text-align: center; }
.empty-state--page { min-height: 296px; }
.empty-state--panel { min-height: 132px; padding: 20px; }
.empty-state__icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; color: var(--weft-text-soft); }
.empty-state--panel .empty-state__icon { width: 38px; height: 38px; }
.empty-state h2, .empty-state h3 { margin: 16px 0 0; font-size: 15px; font-weight: 650; letter-spacing: -.028em; }
.empty-state--panel h3 { margin-top: 11px; font-size: 13px; }
.empty-state p { max-width: 44ch; margin: 7px 0 0; color: var(--weft-text-muted); font-size: 12px; line-height: 1.5; }
.empty-state__action { margin-top: 17px; }
.empty-state__action > .tactile-button { display: inline-flex; min-height: 38px; align-items: center; gap: 8px; padding: 0 17px; font-size: 12px; font-weight: 600; text-decoration: none; }
```

In `attendee-roster.tsx`, delete `RosterEmpty`, import `EmptyState` from `@/shared/ui/empty-state`, and replace each usage. The roster lives inside a panel, so use `size="page"` (it keeps the 296px height the roster had). The filter case becomes:

```tsx
<EmptyState
  action={<TactileButton onClick={clearFilters}>Clear filters</TactileButton>}
  description="No guest on this roster matches the current search and filters."
  icon={PeopleIcon}
  title="No matching attendees"
/>
```

The other two usages keep their existing `title`/`detail` text as `title`/`description` with `icon={PeopleIcon}`.

- [ ] **Step 4: Run tests**

Run: `node --test tests/empty-state.test.mjs && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/empty-state.tsx src/app/globals.css src/modules/events/components/attendee-roster.tsx tests/empty-state.test.mjs
git commit -m "feat(ui): shared on-brand empty state"
```

---

### Task 2: Weft shell branding and the signed-in viewer

**Files:**
- Modify: `src/shared/ui/console-sidebar.tsx` (whole component)
- Modify: `src/modules/events/components/event-access-state.tsx`
- Modify: `src/app/events/[eventId]/page.tsx`, `src/app/events/new/page.tsx`
- Modify: `src/modules/events/components/event-detail-page.tsx` (accept and forward `viewer`)
- Modify: `src/modules/events/components/create-event-page.tsx` (forward `viewer` to its `ConsoleSidebar`)
- Test: `tests/console-shell.test.mjs`

**Interfaces:**
- Produces: `export type ConsoleViewer = { displayName: string; avatarUrl: string | null }` and `ConsoleSidebar({ active, viewer }: { active: ConsoleDestination; viewer?: ConsoleViewer | null })` from `console-sidebar.tsx`. `AuthenticatedUser` is structurally assignable to `ConsoleViewer`.
- Produces: `EventAccessState({ title, description, action?, active?, viewer?, showBackLink? })` with `active: ConsoleDestination = "events"`, `showBackLink = true`.
- Produces: `EventDetailPage({ event, initialTab, viewer })`, `CreateEventPage({ context, viewer })`.

- [ ] **Step 1: Write the failing test**

```js
// tests/console-shell.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const render = (props) => {
  const { ConsoleSidebar } = loadTs("src/shared/ui/console-sidebar.tsx");
  return renderToStaticMarkup(React.createElement(ConsoleSidebar, props));
};

test("sidebar carries Weft branding and no tenant demo copy", () => {
  const html = render({ active: "overview" });
  assert.match(html, /aria-label="Weft"/);
  assert.match(html, /The networking layer for business events\./);
  assert.doesNotMatch(html, /WE ARE ONE|We Are One|Nick|Stronger Tomorrow/i);
});

test("sidebar shows the signed-in viewer, or a quiet signed-out row", () => {
  assert.match(render({ active: "events", viewer: { displayName: "Ada Lovelace", avatarUrl: null } }), /Ada Lovelace/);
  const signedOut = render({ active: "events", viewer: null });
  assert.match(signedOut, /Not signed in/);
  assert.doesNotMatch(signedOut, /profile__chevron/);
});

test("unsupported Outcomes navigation is disabled, not a dead anchor", () => {
  const html = render({ active: "overview" });
  assert.doesNotMatch(html, /href="#outcomes"/);
  assert.match(html, /aria-disabled="true"[^>]*>.*Outcomes/s);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/console-shell.test.mjs`
Expected: FAIL (`aria-label="Weft"` not found).

- [ ] **Step 3: Implement the sidebar**

In `console-sidebar.tsx`, keep imports and `navigation`, change the `outcomes` item to `href: ""`, and replace the component:

```tsx
export type ConsoleViewer = { displayName: string; avatarUrl: string | null };

function ViewerProfile({ viewer }: { viewer: ConsoleViewer | null }) {
  if (!viewer) {
    return (
      <div className="profile profile--signed-out">
        <div className="avatar" aria-hidden="true" />
        <div className="profile__text"><span className="profile__name">Not signed in</span></div>
      </div>
    );
  }
  return (
    <div className="profile">
      <div className="avatar" aria-hidden="true">
        {viewer.avatarUrl
          ? <Image alt="" height={36} src={viewer.avatarUrl} unoptimized width={36} />
          : viewer.displayName.trim().charAt(0).toUpperCase()}
      </div>
      <div className="profile__text"><span className="profile__name">{viewer.displayName}</span></div>
      <ChevronDownIcon className="profile__chevron" height="15" width="15" />
    </div>
  );
}

export function ConsoleSidebar({ active, viewer = null }: { active: ConsoleDestination; viewer?: ConsoleViewer | null }) {
  return (
    <Surface as="aside" className="sidebar" depth="raised">
      <div className="brand" aria-label="Weft">
        <div className="brand-mark"><span /></div>
        <span className="brand-wordmark">Weft</span>
      </div>
      <nav aria-label="Primary navigation">
        <ul className="nav-list">
          {navigation.map(({ href, icon: Icon, key, label, supported }) => {
            const isActive = key === active;
            const className = `nav-link ${isActive ? "nav-link--active surface-pressed" : ""}`;
            const content = <><Icon height="19" width="19" /><span>{label}</span></>;
            return (
              <li key={key}>
                {supported ? (
                  <Link className={className} href={href} aria-current={isActive ? "page" : undefined}>{content}</Link>
                ) : (
                  <span className={`${className} nav-link--disabled`} aria-disabled="true">{content}</span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="brand-story" aria-label="The networking layer for business events.">
        <div className="brand-story__copy">
          <strong>The networking layer<br />for business events.</strong>
          <span className="brand-story__line" />
          <span className="brand-story__label">Weft</span>
        </div>
      </div>
      <ViewerProfile viewer={viewer} />
    </Surface>
  );
}
```

Add `import Image from "next/image";`. Add to `globals.css` next to the existing `.nav-link` rules: `.nav-link--disabled { cursor: default; opacity: .5; }` and `.profile--signed-out .profile__name { color: var(--weft-text-muted); }` and `.avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }`.

- [ ] **Step 4: Thread the viewer through existing routes**

`event-access-state.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { ConsoleSidebar, type ConsoleDestination, type ConsoleViewer } from "@/shared/ui/console-sidebar";
import { Surface } from "@/shared/ui/surface";

export function EventAccessState({ action, active = "events", description, showBackLink = true, title, viewer = null }: {
  action?: ReactNode; active?: ConsoleDestination; description: string; showBackLink?: boolean; title: string; viewer?: ConsoleViewer | null;
}) {
  return <div className="overview-shell event-detail-shell">
    <div className="dashboard-layout">
      <ConsoleSidebar active={active} viewer={viewer} />
      <main className="dashboard-main event-detail-main">
        <Surface className="event-detail-missing" depth="raised">
          <h1>{title}</h1>
          <p>{description}</p>
          {action}
          {showBackLink ? <Link className="tactile-button tactile-button--graphite event-detail-missing__action" href="/events">Back to events</Link> : null}
        </Surface>
      </main>
    </div>
  </div>;
}
```

`src/app/events/[eventId]/page.tsx`: pass `viewer={actor}` to the `Access required` `EventAccessState` and `<EventDetailPage event={event} initialTab={initialTab} key={initialTab} viewer={actor} />`. In `event-detail-page.tsx` add `viewer: ConsoleViewer` to the props and render `<ConsoleSidebar active="events" viewer={viewer} />` (also in `MissingEvent` if it renders the sidebar; give it a `viewer` prop the same way).

`src/app/events/new/page.tsx`: pass `viewer={actor}` to the access state and `<CreateEventPage context={context} viewer={actor} />`; in `create-event-page.tsx` add the `viewer: ConsoleViewer` prop and forward it to its `ConsoleSidebar`.

- [ ] **Step 5: Run tests**

Run: `node --test tests/console-shell.test.mjs tests/inset-depth.test.mjs && pnpm typecheck`
Expected: PASS. (Overview, Events, People and Network still render the sidebar without a viewer; they are updated in Tasks 4-6.)

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/console-sidebar.tsx src/app/globals.css src/modules/events/components/event-access-state.tsx src/app/events src/modules/events/components/event-detail-page.tsx src/modules/events/components/create-event-page.tsx tests/console-shell.test.mjs
git commit -m "feat(shell): Weft branding and signed-in viewer in the sidebar"
```

---

### Task 3: List events read path

**Files:**
- Modify: `src/modules/events/event-dto.ts` (append `EventSummaryDto`)
- Modify: `src/modules/events/server/repository.ts` (add `listForUser`)
- Modify: `src/modules/events/server/service.ts` (add `listEvents`)
- Create: `src/modules/events/queries/list-events.ts`
- Create: `src/modules/events/event-list.ts` (`groupEvents`, `eventArt`, `formatCountdown`)
- Test: `tests/event-list.test.mjs`, extend `tests/event-database.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export type EventSummaryDto = {
    id: string; name: string; city: string; venue: string;
    startDate: string; endDate: string; startsAt: string; endsAt: string; timezone: string;
    guestCount: number; coverImage: string | null;
    status: "upcoming" | "live" | "completed";
  };
  repository.listForUser(userId: string): Promise<EventSummaryRow[]>
  listEvents({ userId }: { userId: string }, dependencies?: { listForUser }, now?: Date): Promise<EventSummaryDto[]>
  groupEvents(events: EventSummaryDto[]): { live; upcoming; completed; all }  // each EventSummaryDto[]
  eventArt(event: { coverImage: string | null }): CityArt
  formatCountdown(startsAt: string, now?: Date): string
  ```
- Consumes: `deriveScheduleStatus(startsAt, endsAt, now)` from `src/modules/events/event-schedule.ts:39`; `EVENT_COVER_PLACEHOLDER_ART` from `event-record.ts:72`.

- [ ] **Step 1: Write the failing unit tests**

```js
// tests/event-list.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const row = (overrides) => ({
  id: "33333333-3333-4333-8333-333333333333", name: "Launch", city: "Singapore", venue: "",
  startDate: "2026-11-19", endDate: "2026-11-19", timezone: "Asia/Singapore",
  startsAt: new Date("2026-11-19T01:00:00Z"), endsAt: new Date("2026-11-19T10:00:00Z"),
  guestCount: 2, hasCover: false, ...overrides,
});

test("listEvents maps rows to summaries with a schedule status and protected cover URL", async () => {
  const { listEvents } = loadTs("src/modules/events/server/service.ts");
  const now = new Date("2026-11-19T05:00:00Z");
  const [event] = await listEvents({ userId: "u" }, { listForUser: async () => [row({ hasCover: true })] }, now);
  assert.equal(event.status, "live");
  assert.equal(event.startsAt, "2026-11-19T01:00:00.000Z");
  assert.equal(event.coverImage, "/api/events/33333333-3333-4333-8333-333333333333/cover");
  assert.equal(event.guestCount, 2);
});

test("status boundaries follow the schedule: start is live, end is completed", async () => {
  const { listEvents } = loadTs("src/modules/events/server/service.ts");
  const { deriveScheduleStatus } = loadTs("src/modules/events/event-schedule.ts");
  for (const now of [new Date("2026-11-19T00:59:59Z"), new Date("2026-11-19T01:00:00Z"), new Date("2026-11-19T10:00:00Z")]) {
    const [event] = await listEvents({ userId: "u" }, { listForUser: async () => [row({})] }, now);
    assert.equal(event.status, deriveScheduleStatus("2026-11-19T01:00:00.000Z", "2026-11-19T10:00:00.000Z", now));
  }
});

test("groupEvents splits by status: upcoming soonest first, completed latest first, all newest first", () => {
  const { groupEvents } = loadTs("src/modules/events/event-list.ts");
  const summary = (id, status, startsAt) => ({ id, status, startsAt, coverImage: null });
  const events = [
    summary("a", "completed", "2026-01-01T00:00:00.000Z"),
    summary("b", "upcoming", "2026-12-01T00:00:00.000Z"),
    summary("c", "live", "2026-10-01T00:00:00.000Z"),
    summary("d", "upcoming", "2026-11-01T00:00:00.000Z"),
    summary("e", "completed", "2026-06-01T00:00:00.000Z"),
  ];
  const grouped = groupEvents(events);
  assert.deepEqual(grouped.live.map((e) => e.id), ["c"]);
  assert.deepEqual(grouped.upcoming.map((e) => e.id), ["d", "b"]);
  assert.deepEqual(grouped.completed.map((e) => e.id), ["e", "a"]);
  assert.deepEqual(grouped.all.map((e) => e.id), ["b", "d", "c", "e", "a"]);
});

test("eventArt uses the uploaded cover or the neutral placeholder, never city art", () => {
  const { eventArt } = loadTs("src/modules/events/event-list.ts");
  const { EVENT_COVER_PLACEHOLDER_ART } = loadTs("src/modules/events/event-record.ts");
  assert.deepEqual(eventArt({ coverImage: null }), EVENT_COVER_PLACEHOLDER_ART);
  assert.equal(eventArt({ coverImage: "/api/events/x/cover" }).image, "/api/events/x/cover");
});

test("formatCountdown reads naturally", () => {
  const { formatCountdown } = loadTs("src/modules/events/event-list.ts");
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(formatCountdown("2026-10-03T18:00:00.000Z", now), "Starts today");
  assert.equal(formatCountdown("2026-10-04T12:00:00.000Z", now), "In 1 day");
  assert.equal(formatCountdown("2026-10-13T12:00:00.000Z", now), "In 10 days");
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/event-list.test.mjs`
Expected: FAIL (`listEvents is not a function`).

- [ ] **Step 3: Implement**

Append to `event-dto.ts`:

```ts
export type EventSummaryDto = {
  id: string; name: string; city: string; venue: string;
  startDate: string; endDate: string; startsAt: string; endsAt: string; timezone: string;
  guestCount: number; coverImage: string | null;
  status: "upcoming" | "live" | "completed";
};
```

Append to `repository.ts` (add `desc`, `sql` to the `drizzle-orm` import):

```ts
export type EventSummaryRow = {
  id: string; name: string; city: string; venue: string | null;
  startDate: string; endDate: string; timezone: string;
  startsAt: Date; endsAt: Date; guestCount: number; hasCover: boolean;
};

/** Events the user may operate: active owner or organizer membership only. */
export async function listForUser(userId: string): Promise<EventSummaryRow[]> {
  return getDatabase().select({
    id: events.id, name: events.name, city: events.city, venue: events.venue,
    startDate: events.startDate, endDate: events.endDate, timezone: events.timezone,
    startsAt: events.startsAt, endsAt: events.endsAt,
    guestCount: sql<number>`(select count(*)::int from ${eventGuests} where ${eventGuests.eventId} = ${events.id})`,
    hasCover: sql<boolean>`exists (select 1 from ${eventCovers} where ${eventCovers.eventId} = ${events.id})`,
  }).from(events)
    .innerJoin(organizationMemberships, and(
      eq(organizationMemberships.organizationId, events.organizationId),
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.active, true),
      inArray(organizationMemberships.role, ["owner", "organizer"]),
    ))
    .orderBy(desc(events.startsAt));
}
```

Append to `service.ts` (import `deriveScheduleStatus` from `../event-schedule` and `EventSummaryDto` from `../event-dto`):

```ts
export async function listEvents(
  { userId }: { userId: string },
  dependencies: { listForUser: typeof repository.listForUser } = repository,
  now = new Date(),
): Promise<EventSummaryDto[]> {
  const rows = await dependencies.listForUser(userId);
  return rows.map((row) => {
    const startsAt = row.startsAt.toISOString();
    const endsAt = row.endsAt.toISOString();
    return {
      id: row.id, name: row.name, city: row.city, venue: row.venue ?? "",
      startDate: row.startDate, endDate: row.endDate, startsAt, endsAt, timezone: row.timezone,
      guestCount: row.guestCount, coverImage: row.hasCover ? `/api/events/${row.id}/cover` : null,
      status: deriveScheduleStatus(startsAt, endsAt, now),
    };
  });
}
```

Create `src/modules/events/queries/list-events.ts`:

```ts
export { listEvents } from "../server/service";
```

Create `src/modules/events/event-list.ts`:

```ts
import type { CityArt } from "@/shared/ui/city-artwork";
import type { EventSummaryDto } from "./event-dto";
import { EVENT_COVER_PLACEHOLDER_ART } from "./event-record";

type Groupable = Pick<EventSummaryDto, "startsAt" | "status">;

export function groupEvents<T extends Groupable>(events: T[]) {
  const ascending = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    live: ascending.filter((event) => event.status === "live"),
    upcoming: ascending.filter((event) => event.status === "upcoming"),
    completed: ascending.filter((event) => event.status === "completed").reverse(),
    all: [...ascending].reverse(),
  };
}

export function eventArt(event: { coverImage: string | null }): CityArt {
  return event.coverImage ? { ...EVENT_COVER_PLACEHOLDER_ART, image: event.coverImage } : EVENT_COVER_PLACEHOLDER_ART;
}

export function formatCountdown(startsAt: string, now = new Date()) {
  const days = Math.floor((new Date(startsAt).getTime() - now.getTime()) / 86_400_000);
  if (days < 1) return "Starts today";
  return `In ${days} ${days === 1 ? "day" : "days"}`;
}
```

- [ ] **Step 4: Run unit tests**

Run: `node --test tests/event-list.test.mjs && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Extend the database test**

In `tests/event-database.test.mjs`, inside the second test, directly after the `getEventCover` assertion (`assert.ok((await getEventCover(...)).bytes.length > 0);`), add:

```js
    const listed = await repository.listForUser(userId);
    const summary = listed.find((event) => event.id === created.id);
    assert.equal(summary?.guestCount, 2);
    assert.equal(summary?.hasCover, true);
    assert.equal((await repository.listForUser(outsiderId)).some((event) => event.id === created.id), false);
    assert.equal((await repository.listForUser(staffUserId)).some((event) => event.id === created.id), false);
```

(`repository` is already loaded higher in that test; move its `loadTs` line above these assertions if needed.)

- [ ] **Step 6: Run the live database suite**

Run: `set -a; . ./.env.local; set +a; WEFT_DATABASE_TEST=1 node --test tests/event-database.test.mjs`
Expected: PASS (5 tests). If `.env.local` is missing, record the suite as not run in the task report; do not point it at any database other than `weft_console_test`.

- [ ] **Step 7: Commit**

```bash
git add src/modules/events/event-dto.ts src/modules/events/server src/modules/events/queries/list-events.ts src/modules/events/event-list.ts tests/event-list.test.mjs tests/event-database.test.mjs
git commit -m "feat(events): list a user's operable events"
```

---

### Task 4: Real `/events` page

**Files:**
- Modify: `src/app/events/page.tsx`
- Modify: `src/modules/events/components/events-page.tsx`, `live-event-panel.tsx`, `upcoming-events-panel.tsx`, `all-events-table.tsx`, `recently-completed-panel.tsx`
- Modify: `src/shared/ui/city-artwork.tsx` (unoptimized protected images)
- Delete: `src/modules/events/events-data.ts` (after Task 6 removes its last importer; see Step 6)
- Test: `tests/events-page.test.mjs`

**Interfaces:**
- Consumes: `listEvents`, `groupEvents`, `eventArt`, `formatCountdown`, `EventSummaryDto` (Task 3); `EmptyState` (Task 1); `ConsoleViewer`, `EventAccessState({ active, showBackLink, viewer })` (Task 2); `formatEventDateRange(start, end)` from `event-record.ts:105`.
- Produces: `EventsPage({ events, viewer }: { events: EventSummaryDto[]; viewer: ConsoleViewer })`. Panels take `{ event }` / `{ events }` props.

- [ ] **Step 1: Write the failing test**

```js
// tests/events-page.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const viewer = { displayName: "Ada", avatarUrl: null };
const event = (id, status, startsAt) => ({
  id, name: `Event ${id}`, city: "Singapore", venue: "", startDate: startsAt.slice(0, 10), endDate: startsAt.slice(0, 10),
  startsAt, endsAt: startsAt, timezone: "Asia/Singapore", guestCount: 12, coverImage: null, status,
});
const render = (events) => {
  const { EventsPage } = loadTs("src/modules/events/components/events-page.tsx");
  return renderToStaticMarkup(React.createElement(EventsPage, { events, viewer }));
};

test("no events shows the page empty state with one create action", () => {
  const html = render([]);
  assert.match(html, /No events yet/);
  assert.match(html, /Create your first event to start operating its networking experience\./);
  assert.equal(html.match(/href="\/events\/new"/g)?.length, 2); // header "New event" + empty-state action
  assert.doesNotMatch(html, /Upcoming events|Recently completed|All events/);
});

test("protected covers bypass image optimization; static art does not", () => {
  const { CityArtwork } = loadTs("src/shared/ui/city-artwork.tsx");
  const { eventArt } = loadTs("src/modules/events/event-list.ts");
  const html = renderToStaticMarkup(React.createElement(CityArtwork, { art: eventArt({ coverImage: "/api/events/x/cover" }) }));
  assert.match(html, /src="\/api\/events\/x\/cover"/);
  assert.doesNotMatch(html, /_next\/image/);
});

test("events render from data with real links and counts", () => {
  const html = render([event("11111111-1111-4111-8111-111111111111", "upcoming", "2099-01-01T00:00:00.000Z")]);
  assert.match(html, /href="\/events\/11111111-1111-4111-8111-111111111111"/);
  assert.match(html, /Showing 1 event/);
  assert.match(html, /No live events right now/);
  assert.match(html, /No completed events yet/);
  assert.doesNotMatch(html, /Las Vegas|We Are One|las-vegas-f1-week|Showing 8 of 12/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/events-page.test.mjs`
Expected: FAIL (`EventsPage` ignores `events`; "No events yet" missing).

- [ ] **Step 3: Implement the route**

```tsx
// src/app/events/page.tsx
import type { Metadata } from "next";

import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { EventAccessState } from "@/modules/events/components/event-access-state";
import { EventsPage } from "@/modules/events/components/events-page";
import { listEvents } from "@/modules/events/queries/list-events";

export const metadata: Metadata = { title: "Events · Weft Console" };
export const dynamic = "force-dynamic";

export default async function Events() {
  const actor = await getCurrentUser();
  if (!actor) return <EventAccessState showBackLink={false} title="Authentication required" description="Sign in through the configured organization authentication system to view your events." />;
  return <EventsPage events={await listEvents({ userId: actor.id })} viewer={actor} />;
}
```

- [ ] **Step 4: Implement the page and panels**

`city-artwork.tsx`: add `unoptimized={art.image.startsWith("/api/")}` to the `<Image>`.

`events-page.tsx`:

```tsx
import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { groupEvents } from "../event-list";
import { ConsoleSidebar, type ConsoleViewer } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { CalendarIcon, PlusIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { AllEventsTable } from "./all-events-table";
import { LiveEventPanel } from "./live-event-panel";
import { RecentlyCompletedPanel } from "./recently-completed-panel";
import { UpcomingEventsPanel } from "./upcoming-events-panel";

const newEventLink = (label: string) => (
  <Link className="tactile-button tactile-button--primary new-event-action" href="/events/new">
    <PlusIcon height="16" width="16" /> {label}
  </Link>
);

export function EventsPage({ events, viewer }: { events: EventSummaryDto[]; viewer: ConsoleViewer }) {
  const grouped = groupEvents(events);
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="events" viewer={viewer} />
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">Events</h1>
              <p className="events-header__subtitle">Every event your organization operates on Weft.</p>
            </div>
            <div className="events-header__actions">{newEventLink("New event")}</div>
          </header>
          <div className="content-stack">
            {events.length === 0 ? (
              <Surface as="section" className="panel" depth="raised">
                <EmptyState
                  action={<Link className="tactile-button tactile-button--primary" href="/events/new">Create event</Link>}
                  description="Create your first event to start operating its networking experience."
                  icon={CalendarIcon}
                  title="No events yet"
                />
              </Surface>
            ) : (
              <>
                <LiveEventPanel event={grouped.live[0] ?? null} />
                <UpcomingEventsPanel events={grouped.upcoming.slice(0, 3)} />
                <AllEventsTable events={grouped.all} />
                <RecentlyCompletedPanel events={grouped.completed.slice(0, 3)} />
              </>
            )}
            <footer className="dashboard-footer"><span>Powered by Weft</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
```

`live-event-panel.tsx` — replace the body; delete `LiveMetric`, `glyphs` and the `ProgressRing`/`LinkIcon`/`ClockIcon` imports:

```tsx
import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function LiveEventPanel({ event }: { event: EventSummaryDto | null }) {
  if (!event) {
    return (
      <Surface as="section" className="panel" depth="raised" aria-label="Live event">
        <EmptyState icon={CalendarIcon} size="panel" title="No live events right now" />
      </Surface>
    );
  }
  const dates = formatEventDateRange(event.startDate, event.endDate);
  return (
    <Surface as="section" className="panel live-panel" depth="raised" aria-labelledby="live-event-title">
      <CityArtwork art={eventArt(event)} className="city-art--cinematic" eager>
        <span className="live-badge"><span /> Live</span>
        <span className="city-art__scrim" />
        <span className="city-art__caption"><strong>{event.city}</strong><em>{dates}</em></span>
      </CityArtwork>
      <div className="live-body">
        <div className="live-headline">
          <div>
            <p className="live-flag"><span className="live-dot" /> Live now</p>
            <h2 className="live-title" id="live-event-title">{event.name}</h2>
            <p className="live-meta">{dates} &nbsp;•&nbsp; {event.venue || event.city}</p>
          </div>
          <Link className="tactile-button tactile-button--graphite live-action" href={`/events/${event.id}`}>
            Open event <ArrowRightIcon height="16" width="16" />
          </Link>
        </div>
        <div className="live-metrics">
          <article className="live-metric">
            <Surface className="live-metric__glyph" depth="inset"><PeopleIcon height="18" width="18" /></Surface>
            <div className="live-metric__body">
              <strong className="live-metric__value">{event.guestCount.toLocaleString()}</strong>
              <span className="live-metric__label">Guests</span>
            </div>
          </article>
        </div>
      </div>
    </Surface>
  );
}
```

`upcoming-events-panel.tsx`:

```tsx
import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt, formatCountdown } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function UpcomingEventsPanel({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="upcoming-events-title">Upcoming events</h2>
        </div>
      </div>
      {events.length === 0 ? <EmptyState icon={CalendarIcon} size="panel" title="No upcoming events" /> : (
        <div className="upcoming-grid">
          {events.map((event) => (
            <Surface as="article" className="upcoming-card" depth="inset" key={event.id}>
              <CityArtwork art={eventArt(event)} className="city-art--photo upcoming-card__art" />
              <div className="upcoming-card__body">
                <div className="upcoming-card__head">
                  <h3>{event.name}</h3>
                  <span className="countdown-pill">{formatCountdown(event.startsAt)}</span>
                </div>
                <p className="upcoming-card__date">{formatEventDateRange(event.startDate, event.endDate)} · {event.city}</p>
                <div className="event-meta upcoming-card__meta">
                  <span><PeopleIcon height="13" width="13" />{event.guestCount.toLocaleString()} guests</span>
                </div>
                <Link className="tactile-button card-action" href={`/events/${event.id}`}>
                  View event <ArrowRightIcon height="15" width="15" />
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}
```

`recently-completed-panel.tsx`:

```tsx
import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function RecentlyCompletedPanel({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel report-panel" depth="raised" aria-labelledby="recently-completed-title">
      <div className="panel-heading">
        <div className="section-head">
          <OutcomesIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="recently-completed-title">Recently completed</h2>
        </div>
      </div>
      {events.length === 0 ? <EmptyState icon={OutcomesIcon} size="panel" title="No completed events yet" /> : (
        <div className="report-grid">
          {events.map((event) => (
            <Surface as="article" className="report-card" depth="inset" key={event.id}>
              <CityArtwork art={eventArt(event)} className="city-art--photo report-card__art" />
              <div className="report-card__body">
                <h3>{event.name}</h3>
                <p className="report-card__meta">{event.city} &nbsp;·&nbsp; {formatEventDateRange(event.startDate, event.endDate)}</p>
                <div className="report-stats"><div><strong>{event.guestCount.toLocaleString()}</strong><span>Guests</span></div></div>
                <Link className="tactile-button card-action" href={`/events/${event.id}`}>
                  Open event <ArrowRightIcon height="15" width="15" />
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}
```

`all-events-table.tsx` — no search, sort or pagination controls (none of them were wired); columns are the ones with a data source:

```tsx
import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { CalendarIcon, ChevronRightIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

const statusLabels = { live: "Live", upcoming: "Upcoming", completed: "Completed" } as const;

export function AllEventsTable({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel table-panel all-events-panel" depth="raised" aria-labelledby="all-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="all-events-title">All events</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table className="event-table all-events-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Status</th><th>Guests</th><th><span className="chart-summary">Open</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork art={eventArt(event)} className="mini-city" /><Link href={`/events/${event.id}`}>{event.name}</Link></div></td>
                <td className="cell-muted">{event.city}</td>
                <td className="cell-muted">{formatEventDateRange(event.startDate, event.endDate)}</td>
                <td><span className={`status-pill status-pill--${event.status}`}>{statusLabels[event.status]}</span></td>
                <td>{event.guestCount.toLocaleString()}</td>
                <td className="cell-action"><Link aria-label={`Open ${event.name}`} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {events.length} {events.length === 1 ? "event" : "events"}</span></div>
    </Surface>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `node --test tests/events-page.test.mjs tests/event-list.test.mjs && pnpm typecheck`
Expected: PASS. `events-data.ts` is still imported by `partner-report-data.ts`; it is deleted in Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/app/events/page.tsx src/modules/events/components src/shared/ui/city-artwork.tsx tests/events-page.test.mjs
git commit -m "feat(events): render the events list from real data"
```

---

### Task 5: Real Overview

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/modules/insights/components/organizer-overview.tsx` (rewrite)
- Delete: `src/modules/insights/overview-data.ts`
- Keep unchanged: `connection-quality-chart.tsx`, `repeat-attendance-chart.tsx` (presentational, prop-driven; `inset-depth.test.mjs` reads the latter)
- Test: `tests/overview-page.test.mjs`

**Interfaces:**
- Consumes: `listEvents`, `groupEvents`, `eventArt`, `formatCountdown`, `EventSummaryDto` (Task 3); `EmptyState` (Task 1); `ConsoleViewer`, `EventAccessState` (Task 2).
- Produces: `OrganizerOverview({ events, viewer }: { events: EventSummaryDto[]; viewer: ConsoleViewer })`.

- [ ] **Step 1: Write the failing test**

```js
// tests/overview-page.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const viewer = { displayName: "Ada", avatarUrl: null };
const render = (events) => {
  const { OrganizerOverview } = loadTs("src/modules/insights/components/organizer-overview.tsx");
  return renderToStaticMarkup(React.createElement(OrganizerOverview, { events, viewer }));
};
const event = (id, city, status, startsAt, guestCount) => ({
  id, name: `Event ${id}`, city, venue: "", startDate: startsAt.slice(0, 10), endDate: startsAt.slice(0, 10),
  startsAt, endsAt: startsAt, timezone: "UTC", guestCount, coverImage: null, status,
});

test("no events: only the hero and the create-event empty state", () => {
  const html = render([]);
  assert.match(html, /No events yet/);
  assert.match(html, /Create your first event to start measuring networking outcomes\./);
  assert.doesNotMatch(html, /metric__value|Event performance|Not enough data yet/);
});

test("metrics and tables come from events; outcomes show an honest empty state", () => {
  const html = render([
    event("a", "Singapore", "upcoming", "2099-01-01T00:00:00.000Z", 10),
    event("b", "Davos", "completed", "2026-01-01T00:00:00.000Z", 5),
  ]);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Events<\/div>/);
  assert.match(html, /<div class="metric__value">15<\/div><div class="metric__label">Guests<\/div>/);
  assert.match(html, /<div class="metric__value">2<\/div><div class="metric__label">Cities<\/div>/);
  assert.match(html, /Not enough data yet/);
  assert.match(html, /href="\/events\/a"/);
  assert.doesNotMatch(html, /1,840|Miami|WE ARE ONE|map\.png|Move<br\/>Together/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/overview-page.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/app/page.tsx
import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { EventAccessState } from "@/modules/events/components/event-access-state";
import { listEvents } from "@/modules/events/queries/list-events";
import { OrganizerOverview } from "@/modules/insights/components/organizer-overview";

export const dynamic = "force-dynamic";

export default async function Home() {
  const actor = await getCurrentUser();
  if (!actor) return <EventAccessState active="overview" showBackLink={false} title="Authentication required" description="Sign in through the configured organization authentication system to view your overview." />;
  return <OrganizerOverview events={await listEvents({ userId: actor.id })} viewer={actor} />;
}
```

```tsx
// src/modules/insights/components/organizer-overview.tsx
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import type { EventSummaryDto } from "@/modules/events/event-dto";
import { eventArt, formatCountdown, groupEvents } from "@/modules/events/event-list";
import { formatEventDateRange } from "@/modules/events/event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { ConsoleSidebar, type ConsoleViewer } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { ArrowRightIcon, CalendarIcon, ChevronRightIcon, LocationIcon, OutcomesIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

function Hero({ events }: { events: EventSummaryDto[] }) {
  const cities = new Set(events.map((event) => event.city)).size;
  const next = groupEvents(events).upcoming[0];
  return (
    <Surface as="section" className="hero-panel" depth="raised" aria-labelledby="overview-heading">
      <div className="hero-copy">
        <p className="section-kicker">Overview</p>
        <h1 className="hero-title" id="overview-heading">Your event network</h1>
        {events.length ? (
          <p className="hero-meta">
            <span>{events.length} {events.length === 1 ? "event" : "events"} across {cities} {cities === 1 ? "city" : "cities"}</span>
            {next ? <><span>·</span><span>Next: {next.name}, {formatEventDateRange(next.startDate, next.endDate)}</span></> : null}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}

function Metric({ icon: Icon, label, value }: { icon: Glyph; label: string; value: number }) {
  return (
    <Surface as="article" className="metric" depth="raised">
      <Surface className="metric__icon" depth="inset"><Icon /></Surface>
      <div className="metric__value">{value.toLocaleString()}</div><div className="metric__label">{label}</div>
    </Surface>
  );
}

function EventsTable({ events, total }: { events: EventSummaryDto[]; total: number }) {
  return (
    <Surface as="section" className="panel table-panel" depth="raised" aria-labelledby="event-performance-title">
      <div className="panel-heading"><h2 className="panel-title" id="event-performance-title">Your events</h2></div>
      <div className="table-scroll">
        <table className="event-table">
          <thead><tr><th>Event</th><th>City</th><th>Date</th><th>Guests</th><th><span className="chart-summary">Open</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork className="mini-city" art={eventArt(event)} /><span>{event.name}</span></div></td>
                <td>{event.city}</td><td>{formatEventDateRange(event.startDate, event.endDate)}</td><td>{event.guestCount.toLocaleString()}</td>
                <td><Link aria-label={`Open ${event.name}`} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>Showing {events.length} of {total} {total === 1 ? "event" : "events"}</span><Link className="text-link" href="/events">View all events <ArrowRightIcon height="15" width="15" /></Link></div>
    </Surface>
  );
}

function UpcomingEvents({ events }: { events: EventSummaryDto[] }) {
  return (
    <Surface as="section" className="panel upcoming-panel" depth="raised" aria-labelledby="upcoming-title">
      <div className="panel-heading"><h2 className="panel-title" id="upcoming-title">Upcoming events</h2></div>
      {events.length === 0 ? <EmptyState icon={CalendarIcon} size="panel" title="No upcoming events" /> : (
        <div className="event-card-grid">
          {events.map((event) => (
            <Surface as="article" className="event-card" depth="inset" key={event.id}>
              <CityArtwork className="city-art--large" art={eventArt(event)} />
              <div className="event-card__body"><h3>{event.name}</h3><p>{event.city}</p><div className="event-meta"><span><CalendarIcon height="13" width="13" />{formatEventDateRange(event.startDate, event.endDate)}</span><span><PeopleIcon height="13" width="13" />{event.guestCount.toLocaleString()} guests</span><span>{formatCountdown(event.startsAt)}</span></div></div>
              <Link aria-label={`Open ${event.name}`} className="tactile-button tactile-button--neutral tactile-button--icon" href={`/events/${event.id}`}><ArrowRightIcon height="17" width="17" /></Link>
            </Surface>
          ))}
        </div>
      )}
    </Surface>
  );
}

export function OrganizerOverview({ events, viewer }: { events: EventSummaryDto[]; viewer: ConsoleViewer }) {
  const grouped = groupEvents(events);
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="overview" viewer={viewer} />
        <main className="dashboard-main">
          <div className="content-stack">
            <Hero events={events} />
            {events.length === 0 ? (
              <Surface as="section" className="panel" depth="raised">
                <EmptyState
                  action={<Link className="tactile-button tactile-button--primary" href="/events/new">Create event</Link>}
                  description="Create your first event to start measuring networking outcomes."
                  icon={CalendarIcon}
                  title="No events yet"
                />
              </Surface>
            ) : (
              <>
                <section aria-label="Network overview metrics" className="metrics-grid">
                  <Metric icon={CalendarIcon} label="Events" value={events.length} />
                  <Metric icon={PeopleIcon} label="Guests" value={events.reduce((sum, event) => sum + event.guestCount, 0)} />
                  <Metric icon={CalendarIcon} label="Upcoming" value={grouped.upcoming.length} />
                  <Metric icon={LocationIcon} label="Cities" value={new Set(events.map((event) => event.city)).size} />
                </section>
                <Surface as="section" className="panel" depth="raised" aria-label="Networking outcomes">
                  <EmptyState description="Outcomes appear here once your events have introductions." icon={OutcomesIcon} size="panel" title="Not enough data yet" />
                </Surface>
                <EventsTable events={grouped.all.slice(0, 5)} total={events.length} />
                <UpcomingEvents events={grouped.upcoming.slice(0, 3)} />
              </>
            )}
            <footer className="dashboard-footer"><span>Powered by Weft</span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}
```

Delete `src/modules/insights/overview-data.ts`.

- [ ] **Step 4: Run tests**

Run: `node --test tests/overview-page.test.mjs tests/inset-depth.test.mjs && pnpm typecheck`
Expected: PASS (the overview still contains `className="metric__icon" depth="inset"` and the inset `tbody`).

- [ ] **Step 5: Commit**

```bash
git add -A src/app/page.tsx src/modules/insights tests/overview-page.test.mjs
git commit -m "feat(insights): overview from real events with honest outcome states"
```

---

### Task 6: People, Network and Partner report empty states

**Files:**
- Modify: `src/app/people/page.tsx`, `src/app/network/page.tsx`, `src/app/partner-report/page.tsx`
- Rewrite: `src/modules/attendees/components/people-page.tsx`, `src/modules/network/components/network-page.tsx`, `src/modules/sponsors/components/partner-report-page.tsx`
- Delete: `src/modules/attendees/people-data.ts`, `src/modules/attendees/components/people-directory.tsx`, `src/modules/attendees/components/person-profile-panel.tsx`, `src/modules/network/network-data.ts`, `src/modules/sponsors/partner-report-data.ts`, every other file in `src/modules/sponsors/components/` except `partner-report-page.tsx`, and `src/modules/events/events-data.ts`
- Test: `tests/empty-pages.test.mjs`

Their CSS stays in `globals.css` (several rules are pinned by `inset-depth.test.mjs` and will be reused when these features get a backend).

**Interfaces:**
- Consumes: `EmptyState` (Task 1); `ConsoleSidebar`, `ConsoleViewer` (Task 2).
- Produces: `PeoplePage({ viewer })`, `NetworkPage({ viewer })` with `viewer: ConsoleViewer | null`; `PartnerReportPage()`.

- [ ] **Step 1: Write the failing test**

```js
// tests/empty-pages.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

const render = (path, name, props = {}) => renderToStaticMarkup(React.createElement(loadTs(path)[name], props));

test("people page is an on-brand empty state", () => {
  const html = render("src/modules/attendees/components/people-page.tsx", "PeoplePage", { viewer: null });
  assert.match(html, /<h1[^>]*>People<\/h1>/);
  assert.match(html, /No people yet/);
  assert.match(html, /Guests appear here once you add them to an event\./);
  assert.doesNotMatch(html, /Sarah Chen|1,840|Northstar/);
});

test("network page is an on-brand empty state", () => {
  const html = render("src/modules/network/components/network-page.tsx", "NetworkPage", { viewer: null });
  assert.match(html, /Your network starts here/);
  assert.match(html, /It builds as introductions happen at your events\./);
  assert.doesNotMatch(html, /1,842|avatars/);
});

test("partner report is an on-brand empty state without console navigation", () => {
  const html = render("src/modules/sponsors/components/partner-report-page.tsx", "PartnerReportPage");
  assert.match(html, /No partner report yet/);
  assert.match(html, /Reports appear after a partner&#x27;s event has outcomes\./);
  assert.doesNotMatch(html, /Horizon|Primary navigation/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/empty-pages.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement the three pages**

```tsx
// src/modules/attendees/components/people-page.tsx
import { ConsoleSidebar, type ConsoleViewer } from "@/shared/ui/console-sidebar";
import { EmptyState } from "@/shared/ui/empty-state";
import { PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

export function PeoplePage({ viewer }: { viewer: ConsoleViewer | null }) {
  return (
    <div className="overview-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="people" viewer={viewer} />
        <main className="dashboard-main">
          <header className="events-header">
            <div className="events-header__copy">
              <h1 className="events-header__title">People</h1>
              <p className="events-header__subtitle">Everyone who has attended your events.</p>
            </div>
          </header>
          <div className="content-stack">
            <Surface as="section" className="panel" depth="raised">
              <EmptyState description="Guests appear here once you add them to an event." icon={PeopleIcon} title="No people yet" />
            </Surface>
          </div>
        </main>
      </div>
    </div>
  );
}
```

`network-page.tsx` is the same shape with `active="network"`, title "Network", subtitle "How the people at your events connect.", `icon={NetworkIcon}`, `title="Your network starts here"`, `description="It builds as introductions happen at your events."`.

```tsx
// src/modules/sponsors/components/partner-report-page.tsx
import { EmptyState } from "@/shared/ui/empty-state";
import { OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";

/**
 * Standalone partner report. It deliberately renders without the organizer
 * console navigation — a partner opens this as their own view of one event.
 */
export function PartnerReportPage() {
  return (
    <div className="partner-shell">
      <main className="partner-main">
        <Surface as="section" className="panel" depth="raised">
          <EmptyState description="Reports appear after a partner's event has outcomes." icon={OutcomesIcon} title="No partner report yet" />
        </Surface>
        <footer className="dashboard-footer"><span>Powered by Weft</span></footer>
      </main>
    </div>
  );
}
```

Routes:

```tsx
// src/app/people/page.tsx
import type { Metadata } from "next";

import { getCurrentUser } from "@/infrastructure/auth/current-user";
import { PeoplePage } from "@/modules/attendees/components/people-page";

export const metadata: Metadata = { title: "People · Weft Console" };
export const dynamic = "force-dynamic";

export default async function People() {
  return <PeoplePage viewer={await getCurrentUser()} />;
}
```

`src/app/network/page.tsx`: same, with `title: "Network · Weft Console"` and `<NetworkPage viewer={await getCurrentUser()} />`.

`src/app/partner-report/page.tsx`: `export const metadata: Metadata = { title: "Partner report · Weft" };` and `return <PartnerReportPage />;`.

- [ ] **Step 4: Delete the mock modules and orphaned components**

```bash
git rm src/modules/attendees/people-data.ts src/modules/attendees/components/people-directory.tsx src/modules/attendees/components/person-profile-panel.tsx src/modules/network/network-data.ts src/modules/sponsors/partner-report-data.ts src/modules/events/events-data.ts
git rm $(ls src/modules/sponsors/components/*.tsx | grep -v partner-report-page.tsx)
```

- [ ] **Step 5: Run tests**

Run: `node --test tests/empty-pages.test.mjs && pnpm typecheck && pnpm lint`
Expected: PASS; typecheck confirms nothing still imports a deleted file.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/people src/app/network src/app/partner-report src/modules/attendees src/modules/network src/modules/sponsors src/modules/events/events-data.ts tests/empty-pages.test.mjs
git commit -m "feat: replace People, Network and Partner report mock data with empty states"
```

---

### Task 7: Event detail and Kami preview cleanup

**Files:**
- Modify: `src/modules/events/components/event-detail-page.tsx` (L50-56 `LAS_VEGAS_ART`, L229 Kami readiness, L347-361 `EventTabPlaceholder`, L381 art choice, L411 demo notice)
- Modify: `src/modules/events/kami-preview.ts` (L11-27 types, L97-143 scenarios)
- Modify: `src/modules/events/components/kami-workspace.tsx` (L43, L215, L225, L285)
- Modify: `src/modules/events/components/kami-preview-panel.tsx` (L54 comment, L105-121 suggestion card, section label)
- Modify: `src/modules/events/kami-config.ts:44` (comment wording only)
- Test: `tests/kami-preview.test.mjs`, extend `tests/event-record.test.mjs`

**Interfaces:**
- Produces: `buildKamiPreviewScenarios(event: EventRecord): KamiPreviewScenario[]` (always 3 scenarios). `KamiPreviewPerson` becomes `{ company: string; name: string; role: string }` (no `avatar`).
- Consumes: `EventRecord` from `event-record.ts`; guest fields `firstName`, `lastName`, `company`, `position`, `guestType`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/kami-preview.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const event = (guests) => ({ attendees: { guests, imported: null }, staff: [] });
const guest = (firstName, company, position, guestType = "Attendee") => ({
  firstName, lastName: "Lane", company, position, guestType, email: "", phone: "", linkedin: "", profileType: "", source: "manual",
});

test("preview suggestions come from the event's real guests", () => {
  const { buildKamiPreviewScenarios } = loadTs("src/modules/events/kami-preview.ts");
  const scenarios = buildKamiPreviewScenarios(event([guest("Ada", "Analytical Ltd", "Founder"), guest("Grace", "Cobol Co", "Partner", "VIP")]));
  assert.equal(scenarios.length, 3);
  assert.equal(scenarios[0].suggestion.name, "Ada Lane");
  assert.equal(scenarios[0].suggestion.company, "Analytical Ltd");
  assert.match(scenarios[0].reason, /Ada Lane/);
  assert.equal(scenarios[1].suggestion.name, "Grace Lane");
});

test("with no guests the preview uses generic descriptions, never named people", () => {
  const { buildKamiPreviewScenarios } = loadTs("src/modules/events/kami-preview.ts");
  const scenarios = buildKamiPreviewScenarios(event([]));
  assert.equal(scenarios.length, 3);
  for (const scenario of scenarios) {
    assert.doesNotMatch(JSON.stringify(scenario), /Sarah|Daniel|Sofia|Velocity|Atelier|Meridian|avatars/);
    assert.match(scenario.suggestion.name, /^A /);
  }
});
```

Append to `tests/event-record.test.mjs` (it already reads files with `readFileSync`):

```js
test("event detail carries no demo city art or demo copy", () => {
  const source = readFileSync(new URL("../src/modules/events/components/event-detail-page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /LAS_VEGAS_ART|las_vegas\.png|outside this demo|outside this Overview implementation/);
  assert.doesNotMatch(source, /label: "Kami ready", ready: true/);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/kami-preview.test.mjs tests/event-record.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement the Kami preview change**

In `kami-preview.ts`, remove `avatar` from `KamiPreviewPerson`, delete `KAMI_PREVIEW_SCENARIOS`, and add:

```ts
const SCENARIO_TEMPLATES = [
  { id: "founder", label: "Founder looking for investors", guestMessage: "I'd like to meet investors interested in what I'm building.", fallback: { name: "A partner at a venture fund", role: "Investor", company: "Attending tonight" } },
  { id: "investor", label: "Investor looking for founders", guestMessage: "I'm looking for founders raising this year.", fallback: { name: "A founder raising a seed round", role: "Founder", company: "Attending tonight" } },
  { id: "brand", label: "Brand looking for partners", guestMessage: "We're a brand looking for partners for next season.", fallback: { name: "A head of partnerships", role: "Partnerships", company: "Attending tonight" } },
] as const;

const REPLIES = ["Tell me more about them", "Introduce us", "Show someone else"];

/** Example conversations for the organizer preview, built from this event's guests where possible. */
export function buildKamiPreviewScenarios(event: EventRecord): KamiPreviewScenario[] {
  const guests = event.attendees.guests.filter((guest) => guest.firstName.trim());
  return SCENARIO_TEMPLATES.map((template, index) => {
    const guest = guests[index];
    const suggestion: KamiPreviewPerson = guest
      ? { name: `${guest.firstName} ${guest.lastName}`.trim(), role: guest.position || guest.guestType, company: guest.company }
      : { ...template.fallback };
    const generic = suggestion.name.charAt(0).toLowerCase() + suggestion.name.slice(1);
    return {
      id: template.id,
      label: template.label,
      guestMessage: template.guestMessage,
      replies: REPLIES,
      suggestion,
      reason: guest ? `${suggestion.name} is here tonight and fits what you described.` : `There is ${generic} here tonight who fits what you described.`,
      detail: guest
        ? `${suggestion.name}${suggestion.role ? `, ${suggestion.role}` : ""}${suggestion.company ? ` at ${suggestion.company}` : ""}, is on this event's guest list.`
        : "In a live event, Kami explains why this person is relevant using their guest profile.",
    };
  });
}
```

In `buildKamiFollowUp`, `firstName` for a generic suggestion would be "A"; change it to:

```ts
  const firstName = /^A /.test(scenario.suggestion.name) ? "them" : scenario.suggestion.name.split(" ")[0];
```

Change the doc comment above `buildKamiFollowUp` to "Example answers for the preview conversation. No model call is made."

In `kami-workspace.tsx`: import `buildKamiPreviewScenarios` instead of `KAMI_PREVIEW_SCENARIOS`; add `const scenarios = useMemo(() => buildKamiPreviewScenarios(event), [event]);` next to `context`; use `scenarios[scenarioIndex]` and `scenarios.length`.

In `kami-preview-panel.tsx`: replace the suggestion `<Image …/>` (L110-116) with `<Surface className="kami-suggestion__portrait" depth="inset" aria-hidden="true"><PeopleIcon height="20" width="20" /></Surface>` (import `PeopleIcon`; remove the `next/image` import if now unused); change the L54 comment to "The example exchange."; change the button label "Preview another scenario" to "Show another example"; and where the panel heading names the conversation, label it "Example conversation". In `globals.css:1527`, extend the existing `.kami-suggestion__portrait` rule with `display: grid; place-items: center; color: var(--weft-text-soft);` and drop `object-fit: cover`.

In `kami-config.ts:44` change the comment "in the demo" to "until the WhatsApp channel is connected".

- [ ] **Step 4: Implement the event detail cleanup**

In `event-detail-page.tsx`:
- Delete `LAS_VEGAS_ART` (L50-56) and set `const art = event.coverImage ? { ...EVENT_COVER_PLACEHOLDER_ART, image: event.coverImage } : EVENT_COVER_PLACEHOLDER_ART;` (or import and call `eventArt(event)` from `../event-list`).
- Readiness: replace the Kami item with `{ detail: "Configured in the Kami tab", label: "Kami configured", ready: hasSavedKamiConfig(event.id) }` only if such a helper exists in `kami-config.ts`; otherwise remove the item entirely (do not invent a stored flag).
- `EventTabPlaceholder`: replace the paragraph with a per-tab description: Staff → "Staff coordination arrives in a future release."; Insights → "Event insights appear once introductions start." Change `<h2>{tab.label}</h2>` to `<h2>Coming soon</h2>` and keep the tab label in the icon's `aria-label`.
- Edit button: remove the "Edit event" `TactileButton` and its `showNotice` call (editing is not built; a button that only says so is not production behavior).

- [ ] **Step 5: Run tests**

Run: `node --test tests/kami-preview.test.mjs tests/event-record.test.mjs && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/events src/app/globals.css tests/kami-preview.test.mjs tests/event-record.test.mjs
git commit -m "feat(events): production event detail and guest-based Kami examples"
```

---

### Task 8: Remove demo assets, guard against regressions, update docs

**Files:**
- Delete: `src/modules/events/seed-guests.ts`, `public/samples/attendees-150.csv`, `public/network/avatars/*`, `public/{las_vegas,singapore,davos,miami,monaco,bitcoin_tech_week,map}.png`, `public/{file,globe,next,vercel,window}.svg`
- Modify: `tests/event-record.test.mjs:16` (stale "seed-guests" comment)
- Modify: `README.md` / `docs/backend/create-event.md` only where they mention the sample CSV or demo data
- Test: `tests/no-demo-data.test.mjs`

**Interfaces:** none.

- [ ] **Step 1: Write the guard test**

```js
// tests/no-demo-data.test.mjs
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

test("no source file contains demo data or demo branding", () => {
  const banned = /overview-data|events-data|people-data|network-data|partner-report-data|seed-guests|\/network\/avatars|las_vegas\.png|map\.png|WE ARE ONE|We Are One|Horizon Family Office|Sarah Chen|Nick Baci/;
  const offenders = files("src").filter((path) => /\.(tsx?|css)$/.test(path) && banned.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});

test("demo assets are gone from public/", () => {
  for (const path of ["public/samples", "public/network", "public/las_vegas.png", "public/map.png", "public/vercel.svg"]) {
    assert.equal(existsSync(path), false, `${path} should be removed`);
  }
});
```

- [ ] **Step 2: Run to see what remains**

Run: `node --test tests/no-demo-data.test.mjs`
Expected: FAIL listing the remaining assets (and any leftover strings). Fix every listed source offender in place before continuing.

- [ ] **Step 3: Delete the assets**

```bash
git rm -r public/samples public/network src/modules/events/seed-guests.ts
git rm public/las_vegas.png public/singapore.png public/davos.png public/miami.png public/monaco.png public/bitcoin_tech_week.png public/map.png public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

Change the comment at `tests/event-record.test.mjs:16` to "(for example event-record -> event-schedule)". Search docs for leftovers: `grep -rn "attendees-150\|sample attendee" README.md docs/backend` and remove those lines.

- [ ] **Step 4: Full verification**

Run: `pnpm lint && pnpm test`
Expected: lint clean; every test passes (database tests skip unless `WEFT_DATABASE_TEST=1`).

Then: `pnpm build`
Expected: build succeeds; `/`, `/events`, `/people`, `/network` are now dynamic (`ƒ`).

- [ ] **Step 5: Commit**

```bash
git add -A public src tests README.md docs/backend
git commit -m "chore: remove demo assets and guard against demo data"
```

---

### Task 9: Browser verification

**Files:** none (verification only).

- [ ] **Step 1:** Run `pnpm dev` and open `/`, `/events`, `/events/new`, `/events/00000000-0000-4000-8000-000000000000`, `/people`, `/network`, `/partner-report` at desktop width and 390px width.
- [ ] **Step 2:** Confirm for each: Weft branding in the sidebar, "Not signed in" profile row, Outcomes visibly disabled, no demo names or numbers; `/` and `/events` show "Authentication required" without a "Back to events" link; People, Network and Partner report show their empty states; no horizontal scroll at 390px; no console errors.
- [ ] **Step 3:** Record results (and screenshots if available) in the branch's PR description.
