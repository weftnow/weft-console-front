# Production empty states design

## Goal

The Console shows no fictional people, companies, metrics or events. Every surface either shows real data or an on-brand empty state that explains what will appear and what to do next.

## Scope

In scope:

- Remove all mock data modules, demo assets and inline demo copy.
- Replace tenant demo branding ("WE ARE ONE", "Nick · Organizer") with Weft branding and the signed-in user.
- Add a real list-events query and use it on `/events` and the Overview.
- Add a shared empty-state component and use it on every page without data.

Out of scope:

- Backends for People, Network, Outcomes and the Partner report. These pages show empty states until those features exist.
- The authentication adapter. `getCurrentUser()` keeps returning `null`.
- Persisting Kami configuration (it stays in localStorage).

## 1. Removal

Delete:

- `src/modules/insights/overview-data.ts`
- `src/modules/events/events-data.ts`
- `src/modules/attendees/people-data.ts`
- `src/modules/network/network-data.ts`
- `src/modules/sponsors/partner-report-data.ts`
- `src/modules/events/seed-guests.ts` (unused)
- `public/samples/attendees-150.csv` (unreferenced QA file; the downloadable template stays in `create-event-page.tsx`)
- `public/network/avatars/*`, the city images (`las_vegas`, `singapore`, `davos`, `miami`, `monaco`, `bitcoin_tech_week`, `map`) and the create-next-app SVGs (`file`, `globe`, `next`, `vercel`, `window`)

Clear inline demo content:

- `organizer-overview.tsx`: event/city counts, "Last event" line, 1,840 / 572 / 214 figures, 31% ring, "Showing 5 of 12", demo filter options, "WE ARE ONE" mini brand, `/map.png`, footer.
- `events-page.tsx` and `all-events-table.tsx`: "We Are One" copy and the search, filter, sort and pagination controls, none of which were wired to anything.
- `event-detail-page.tsx`: `LAS_VEGAS_ART`, the "Edit event" button that only showed "Event editing is outside this demo.", and the always-true "Kami ready" readiness item. Events without a cover use `EVENT_COVER_PLACEHOLDER_ART`.
- `people-page.tsx`: demo event and city filter options.
- `network-page.tsx`: hardcoded "1,842 People".
- `src/app/partner-report/page.tsx`: demo metadata title. `partner-mark.tsx` Horizon glyph is removed.

Product enumerations stay: `event-options.ts`, Kami tones/activations/limits, and the in-code CSV template.

## 2. Shell branding

`ConsoleSidebar`:

- Brand block shows the Weft mark and "Weft" wordmark (`aria-label="Weft"`).
- The brand story card shows "The networking layer for business events." in place of the tenant tagline.
- The profile block takes an optional `user: { displayName, avatarUrl, role? } | null` prop. With a user it shows their initial or avatar and name. Without one it shows a muted "Not signed in" row with no chevron.
- Pages pass `getCurrentUser()` through. Markup tested by `tests/inset-depth.test.mjs` (`nav-link--active surface-pressed`) is kept.
- The unsupported "Outcomes" item stays visibly disabled (`aria-disabled`, no `#outcomes` href).

Footers read "Powered by Weft".

## 3. Events list

Repository: `listForUser(userId)` returns events from organizations where the user has an active `owner` or `organizer` membership, ordered by `starts_at`, with guest count and cover presence.

Service: `listEvents({ userId })` returns `EventSummaryDto[]`:

```ts
type EventSummaryDto = {
  id: string; name: string; city: string; venue: string;
  startDate: string; endDate: string; startsAt: string; endsAt: string; timezone: string;
  guestCount: number; coverImage: string | null;
  status: "live" | "upcoming" | "completed";
};
```

`status` is computed by the existing `deriveScheduleStatus(startsAt, endsAt, now)` in `event-schedule.ts`, so the list and Event Detail always agree.

Route usage:

- `/events` is a Server Component that calls `listEvents`. Live, Upcoming, All and Recently completed panels render from the result; links go to `/events/{id}`. "Showing N events" uses the real count.
- `/` calls `listEvents` for the event count and upcoming events. Introduction, connection-quality, repeat-attendance and outcome metrics have no source and render empty states.
- With no user, both routes render `EventAccessState` (authentication required), matching event detail. Unexpected failures render the existing error state; there is no fallback to sample data.

## 4. Empty states

`src/shared/ui/empty-state.tsx`, generalized from `RosterEmpty`:

```tsx
<EmptyState icon={CalendarIcon} title="No events yet"
  description="Create your first event to start measuring networking outcomes."
  action={{ label: "Create event", href: "/events/new" }} size="page" | "panel" />
```

- Inset circular icon well, title, one muted sentence, optional single primary action.
- `size="panel"` is the compact version for one empty panel inside a populated page (for example "No live events right now").
- Uses existing tokens only (`--weft-surface-inset`, `--weft-shadow-inset`, `--weft-text-muted`, existing radii); one orange primary button at most. `RosterEmpty` is replaced by it.

Copy:

| Surface | Title | Description | Action |
|---|---|---|---|
| Overview (no events) | No events yet | Create your first event to start measuring networking outcomes. | Create event |
| Overview metric panels | Not enough data yet | Outcomes appear here once your events have introductions. | none |
| Events (none) | No events yet | Create your first event to start operating its networking experience. | Create event |
| Events panel (live/upcoming/completed empty) | No live events right now / No upcoming events / No completed events yet | none | none |
| People | No people yet | Guests appear here once you add them to an event. | none |
| Network | Your network starts here | It builds as introductions happen at your events. | none |
| Partner report | No partner report yet | Reports appear after a partner's event has outcomes. | none |
| Event detail Staff / Insights tabs | Coming soon | Staff coordination arrives in a future release. / Event insights appear once introductions start. | none |

Pages without data render only the page header and the empty state; no zeroed metrics or empty charts. The People, Network and Partner report presentational components bound to mock data are deleted with it (their CSS stays); they return with their backends.

## 5. Kami preview

`KAMI_PREVIEW_SCENARIOS` fictional people are removed. Suggestions come from the event's real guests (name, company, position) when present; otherwise generic descriptions ("A founder in fintech", "A sponsor in sports media") with initials-free neutral avatars. The panel is labelled "Example conversation". Canned replies stay and are worded as examples.

## 6. Testing

- Status mapping and grouping unit tests, including the start and end boundaries.
- `listEvents` service test with an injected repository: returns only active owner/organizer organizations' events; staff and sponsor memberships return none.
- Database suite: `listForUser` returns the created event for its owner and nothing for an outsider.
- Guard test: no file under `src/` imports the deleted mock modules or references `/network/avatars`, `las_vegas.png` or "WE ARE ONE".
- `tests/inset-depth.test.mjs` still passes; update its expectations only where the tested markup moved into `EmptyState`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and a browser check of every route signed out (the only state reachable until the auth adapter exists). Populated rendering is covered by the service and database tests.
