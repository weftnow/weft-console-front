# Event Detail Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an organizer-facing Event Detail Overview page whose content is populated by the existing Create Event flow and remains available after a browser refresh.

**Architecture:** Keep the App Router route thin and place the complete experience inside the Events capability. Add one Events-owned browser persistence module for typed records, derived status/readiness/metrics, cover normalization, formatting, seeded demo data, and defensive local-storage access; both Create Event and Event Detail consume this module.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, browser `localStorage`, Canvas/File APIs, existing Weft CSS tokens and shared UI primitives.

**Spec:** `docs/superpowers/specs/2026-09-17-event-detail-overview-design.md`

## Global Constraints

- Preserve the existing uncommitted Create Event work and all unrelated workspace changes.
- Do not create intermediate implementation commits because modified Create Event files are already uncommitted user work.
- Do not add dependencies, backend APIs, authentication, or authorization infrastructure.
- Keep the experience explicitly organizer-facing.
- Do not add attendee onboarding, post-event relationship tracking, follow-ups, or opportunities.
- Reuse current Weft tokens, typography, radii, shadows, components, icon conventions, and motion.
- Do not add new feature tests; run the existing validation suite and browser verification.
- Kami is always ready with `Default configuration`.

## File Structure

### Create

- `src/modules/events/event-record.ts` — typed event record, seeded event, persistence helpers, image normalization, metrics/readiness/status derivation, date and relative-time formatting.
- `src/modules/events/components/event-detail-page.tsx` — client-side organizer Event Detail composition and lightweight event-tab interactions.
- `src/app/events/[eventId]/page.tsx` — thin dynamic route and metadata.

### Modify

- `src/modules/events/components/create-event-page.tsx` — serialize current form/import/staff state, persist it, and navigate to the new route.
- `src/modules/events/components/live-event-panel.tsx` — link the existing live-event action to the seeded detail route.
- `src/shared/ui/icons.tsx` — add only the missing pencil/edit glyph required by the detail header.
- `src/app/globals.css` — add Event Detail composition, interaction, empty-state, and responsive styles using existing tokens.

---

### Task 1: Events-Owned Record, Persistence, and Derived View Data

**Files:**

- Create: `src/modules/events/event-record.ts`

**Interfaces:**

- Produces:

```ts
export type EventGuestType = "Attendee" | "VIP" | "Sponsor";

export interface EventGuestRecord {
  company: string;
  email: string;
  firstName: string;
  guestType: EventGuestType;
  lastName: string;
  linkedin: string;
  position: string;
}

export interface EventStaffRecord {
  avatar: string;
  id: string;
  name: string;
  role: string;
}

export interface EventAttendeeImport {
  attendees: number;
  fileName: string;
  sponsors: number;
  vips: number;
}

export interface EventRecord {
  attendees: {
    imported: EventAttendeeImport | null;
    manual: EventGuestRecord[];
  };
  categories: string[];
  city: string;
  coverImage: string | null;
  createdAt: string;
  description: string;
  endDate: string;
  endTime: string;
  expectedAttendees: number | null;
  expectedAudience: string[];
  id: string;
  name: string;
  staff: EventStaffRecord[];
  startDate: string;
  startTime: string;
  updatedAt: string;
  venue: string;
}

export interface EventMetrics {
  attendees: number;
  attendeesAreExpected: boolean;
  sponsors: number;
  staff: number;
  vips: number;
}

export type EventStatus = "upcoming" | "live" | "completed";
export type EventDetailTab = "overview" | "attendees" | "kami" | "staff" | "insights";

export const SEEDED_EVENT: EventRecord;
export function createEventId(name: string, existingIds?: string[]): string;
export function deriveEventMetrics(event: EventRecord): EventMetrics;
export function deriveEventStatus(event: EventRecord, now?: Date): EventStatus;
export function formatEventDateRange(start: string, end: string): string;
export function formatRelativeActivity(isoDate: string, now?: Date): string;
export function getEventDetailTab(value: string | string[] | undefined): EventDetailTab;
export function loadEventRecord(eventId: string): EventRecord | null;
export function normalizeCoverImage(file: File): Promise<string>;
export function saveEventRecord(event: EventRecord): void;
```

- Consumes: browser `localStorage`, `FileReader`, `Image`, and `canvas` only inside guarded functions.

- [ ] **Step 1: Define the versioned record schema and seed event**

Use one storage constant and a record map keyed by event id:

```ts
const EVENT_STORAGE_KEY = "weft:events:v1";
type StoredEvents = Record<string, EventRecord>;
```

Populate `SEEDED_EVENT` with the existing Las Vegas identity and a complete organizer summary: dates `2026-11-19` through `2026-11-22`, Wynn Las Vegas, Las Vegas USA, 186 imported attendees, 23 VIPs, 7 sponsors, five assigned demo staff, useful description, categories, audience profiles, and stable timestamps.

- [ ] **Step 2: Implement defensive parsing and local persistence**

`loadEventRecord` must return the seed only for `las-vegas-f1-week`, return a stored matching record for created ids, and return `null` for unknown ids. Invalid JSON or malformed stored maps must not throw.

`saveEventRecord` must merge the record into the existing map and allow storage quota errors to propagate so Create Event can keep the user in place and show feedback.

- [ ] **Step 3: Implement event-id creation**

Normalize the name to lowercase ASCII segments, remove non-alphanumeric punctuation, collapse dashes, and use `event` when the result is empty. If the slug already exists, append `-2`, `-3`, and so on until it is unique.

- [ ] **Step 4: Implement durable cover normalization**

Decode the selected image in the browser, constrain its longest edge to 1600 pixels while preserving aspect ratio, draw it to a canvas, and export WebP at `0.82` quality. If the browser cannot encode WebP, fall back to the original FileReader data URL. Revoke any temporary object URL after decoding.

- [ ] **Step 5: Implement metric, status, date, and relative-time derivation**

Metrics must add imported counts and manual guests, count manual `VIP` and `Sponsor` values by guest type, and fall back to `expectedAttendees` only when the actual attendee total is zero. Status comparisons must use local calendar boundaries so end-date events remain live through the end date.

- [ ] **Step 6: Run focused static validation**

Run:

```bash
pnpm typecheck
```

Expected: no TypeScript errors from the new record module.

---

### Task 2: Persist and Navigate from Create Event

**Files:**

- Modify: `src/modules/events/components/create-event-page.tsx`

**Interfaces:**

- Consumes: `createEventId`, `normalizeCoverImage`, `saveEventRecord`, `EventGuestRecord`, and `EventStaffRecord` from `../event-record`.
- Produces: a complete `EventRecord` at submit time and navigation to `/events/${event.id}`.

- [ ] **Step 1: Align local guest and staff shapes with the shared event record**

Replace the local `ManualGuest` declaration with `EventGuestRecord`, or alias it directly:

```ts
type ManualGuest = EventGuestRecord;
```

Keep the current UI state and STAFF presentation unchanged. Convert selected staff to `EventStaffRecord[]` only while assembling the record.

- [ ] **Step 2: Add the App Router navigation dependency**

Import `useRouter` from `next/navigation` and initialize it once inside `CreateEventPage`:

```ts
const router = useRouter();
```

- [ ] **Step 3: Make submit asynchronous and assemble the complete record**

Change `createEvent` to `async`, preserve current validation, set `actionState` to `creating`, normalize `coverFile` when present, and create one `EventRecord` from all current form state:

```ts
const imported = csvImport
  ? {
      attendees: csvImport.attendees,
      fileName: csvImport.file.name,
      sponsors: csvImport.sponsors,
      vips: csvImport.vips,
    }
  : null;
```

Use numeric conversion for `form.attendees`, `null` for an empty estimate, `form.profiles` as `expectedAudience`, the current manual guest array, and full selected staff snapshots.

- [ ] **Step 4: Persist before navigation**

Call `saveEventRecord(record)` before `router.push`. On success, navigate to:

```ts
router.push(`/events/${record.id}`);
```

Do not show the old “No data was persisted” message.

- [ ] **Step 5: Handle cover and storage failures deliberately**

If cover normalization alone fails, continue with `coverImage: null`. If `saveEventRecord` throws, restore `actionState` to `idle`, show a neutral error toast explaining that browser storage could not save the event, and do not navigate.

- [ ] **Step 6: Keep Save as Draft behavior intact**

Do not route drafts to Event Detail and do not alter the form’s current local-session behavior beyond correcting any copy that falsely claims persistence.

- [ ] **Step 7: Run focused validation**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: both commands pass.

---

### Task 3: Dynamic Route and Event Detail Composition

**Files:**

- Create: `src/app/events/[eventId]/page.tsx`
- Create: `src/modules/events/components/event-detail-page.tsx`
- Modify: `src/shared/ui/icons.tsx`

**Interfaces:**

- `EventDetailPage({ eventId, initialTab }: { eventId: string; initialTab: EventDetailTab })` loads a browser-local record or the seeded record.
- The route consumes `PageProps<"/events/[eventId]">`, awaits `props.params` and `props.searchParams`, validates the requested tab, and passes both values to the client component.

- [ ] **Step 1: Add the thin Next.js 16 route**

Implement the page with async params and generic metadata:

```tsx
import type { Metadata } from "next";
import { EventDetailPage } from "@/modules/events/components/event-detail-page";

export const metadata: Metadata = {
  title: "Event overview · Weft Console",
};

export default async function EventDetailRoute(
  props: PageProps<"/events/[eventId]">,
) {
  const { eventId } = await props.params;
  const { tab } = await props.searchParams;
  const initialTab = getEventDetailTab(tab);
  return <EventDetailPage eventId={eventId} initialTab={initialTab} />;
}
```

Export `EventDetailTab` and `getEventDetailTab` from the Events record module so route validation and client rendering share one exact tab definition.

- [ ] **Step 2: Add the missing edit icon**

Add `EditIcon` to `src/shared/ui/icons.tsx` using `IconBase`, the existing 24-pixel view box, `currentColor`, and the shared 1.8 stroke weight. Do not introduce an icon dependency.

- [ ] **Step 3: Implement loading and missing-record states**

Mark `EventDetailPage` as a client component. Initialize with a loading state, call `loadEventRecord(eventId)` in an effect, and render a shape-matched skeleton until hydration completes. For an unknown id, render the normal console shell with an accessible raised empty state, `Event not found`, and a tactile link back to `/events`.

- [ ] **Step 4: Implement the event header and actions**

Compose the existing `ConsoleSidebar active="events"`, breadcrumb link, event name, derived status pill, formatted date/venue/city row, neutral Edit Event button, and native `<details>` More disclosure. The Edit Event button opens a small local status notice explaining that editing is outside this demo rather than navigating to an empty form. More menu content must be informational only—`Copy event link` may use `navigator.clipboard` with the same local confirmation state; do not add delete, archive, or duplicate mutations.

- [ ] **Step 5: Implement the cover hero**

Use `next/image` with `fill`, `sizes`, and `unoptimized` for persisted data URLs. When absent, render `CityArtwork` using the existing Las Vegas treatment for the seed and a restrained neutral city treatment for other records. Do not add decorative marketing copy.

- [ ] **Step 6: Implement event tabs and lightweight non-Overview states**

Use Next.js `Link` values shaped as `?tab=overview`, `?tab=attendees`, `?tab=kami`, `?tab=staff`, and `?tab=insights`. Store `initialTab` in local state and synchronize it in an effect when route props change. Default invalid or absent values to Overview.

When a non-Overview tab is active, keep the header, hero, and tab strip visible; replace only the lower Overview content with one calm raised placeholder containing the tab name, a concise scope message, and a link back to Overview.

- [ ] **Step 7: Implement primary metrics**

Use `deriveEventMetrics(event)` and render four compact metric surfaces for Attendees, VIPs, Sponsors, and Staff assigned. If attendees are from the estimate fallback, label the first metric `Expected attendees`; otherwise label it `Attendees`.

- [ ] **Step 8: Implement the summary section**

Render date, venue/city, description, categories, and expected audience inside one raised section with a quieter nested well. Use existing icon and chip conventions. For missing optional content, use explicit copy such as `No venue added`, `No description added`, or `No categories selected`.

- [ ] **Step 9: Implement readiness derivation and card**

Create local readiness rows from the record with these exact rules:

```ts
const readiness = [
  { label: "Event details", ready: Boolean(event.name && event.city && event.startDate && event.endDate), detail: "Complete" },
  { label: "Event context", ready: Boolean(event.description && event.categories.length), detail: "Complete" },
  { label: "Attendees imported", ready: metrics.attendees > 0 && !metrics.attendeesAreExpected, detail: "Complete" },
  { label: "Staff assigned", ready: event.staff.length > 0, detail: "Complete" },
  { label: "Kami ready", ready: true, detail: "Default configuration" },
];
```

For non-Kami rows whose `ready` value is false, display `Needs attention`. Do not mention attendee onboarding.

- [ ] **Step 10: Implement quick actions and Kami card**

Quick actions link to Attendees, Attendees, Staff, and Insights query states respectively. `View Kami settings` links to `?tab=kami`. The Kami card must always state `Kami is ready` and explain that the default event configuration will be active.

- [ ] **Step 11: Implement derived recent activity**

Build at most four rows in this order: attendee list imported, staff member assigned, event details updated, event created. Include a row only when its source state exists, except Event created which is always present. Use `formatRelativeActivity` for timestamps and never describe this as an audit log.

- [ ] **Step 12: Run focused validation**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: both commands pass with no client/server boundary or async params errors.

---

### Task 4: Connect the Existing Events Entry Point

**Files:**

- Modify: `src/modules/events/components/live-event-panel.tsx`

**Interfaces:**

- Produces: a working link from the existing live-event panel to `/events/las-vegas-f1-week`.

- [ ] **Step 1: Replace the non-functional action with a Next.js link**

Import `Link` from `next/link`, remove the unused `TactileButton` import if no longer needed, and render:

```tsx
<Link
  className="tactile-button tactile-button--graphite live-action"
  href="/events/las-vegas-f1-week"
>
  Open event <ArrowRightIcon height="16" width="16" />
</Link>
```

- [ ] **Step 2: Preserve current button geometry**

Ensure `.live-action` retains its current min-height, alignment, padding, typography, single-line label, and tactile hover/press styles when rendered as an anchor.

- [ ] **Step 3: Run focused validation**

Run:

```bash
pnpm lint
pnpm typecheck
```

Expected: no unused imports and no anchor styling regressions.

---

### Task 5: Weft-Native Event Detail Styling and Responsive Behavior

**Files:**

- Modify: `src/app/globals.css`

**Interfaces:**

- Consumes: existing `--weft-*` colors, radii, shadows, and focus tokens.
- Produces: `.event-detail-*` styles isolated from existing Overview, Events, Network, and Create Event screens.

- [ ] **Step 1: Add the desktop shell and event header styles**

Create an Event Detail section after Create Event styles. Use the existing dashboard shell, a compact two-column header, `clamp()` for the event name, a restrained status pill, and current floating-control shadows. Keep action labels on one line.

- [ ] **Step 2: Add hero and tab-strip styles**

Give the hero `var(--weft-radius-lg)`, a stable wide aspect ratio, overflow clipping, and a restrained raised shadow. Style the tabs as one inset horizontal well with floating active content, not five independently floating pills.

- [ ] **Step 3: Add metric and overview-grid styles**

Use a four-column metric grid and a main layout of `minmax(0, 1fr)` plus a restrained operational rail. Metric cards use raised surfaces; their icon wells use inset depth. Avoid strong hover elevation on non-interactive metrics.

- [ ] **Step 4: Add summary, readiness, activity, quick-action, and Kami styles**

Keep the summary inner region flat or inset, use quiet dividers for activity, and apply floating depth only to actual quick-action controls. Style readiness success and attention states with icon plus text, sparse green/orange accents, and no glow.

- [ ] **Step 5: Add short material animations**

Define event-detail-only keyframes for hero settle, tab content arrival, metric value arrival, and readiness check arrival. Use opacity, one-to-four-pixel translation, and at most `scale(.995)`; durations remain approximately 180–280ms.

- [ ] **Step 6: Add explicit responsive layouts**

At approximately 1120px, move the operational rail below the main column and arrange its cards in a balanced grid. At 760px, stack header regions and make the tab strip horizontally scrollable. At 620px, use one content column and either a two-column metric grid or horizontal snap strip. At 430px, keep actions full-width and prevent chip or breadcrumb overflow.

- [ ] **Step 7: Extend reduced-motion coverage**

Ensure Event Detail animations are disabled by the existing `@media (prefers-reduced-motion: reduce)` rule or add selectors inside that rule without duplicating the global duration reset.

- [ ] **Step 8: Check CSS integrity**

Run:

```bash
node --test tests/inset-depth.test.mjs
```

Expected: PASS, confirming the shared inset-depth conventions remain intact.

---

### Task 6: End-to-End Verification and Polish

**Files:**

- Modify only files already listed when verification exposes a defect.

**Interfaces:**

- Consumes: completed Create Event and Event Detail flow.
- Produces: evidence that required flows and existing project checks pass.

- [ ] **Step 1: Run the required project checks**

Run in order:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: every command exits successfully.

- [ ] **Step 2: Verify the seeded route**

Open `/events`, activate `Open event`, and confirm navigation to `/events/las-vegas-f1-week`. Verify event identity, upcoming/live/completed status derivation, hero fallback, four metrics, summary, readiness, activity, quick actions, and Kami default configuration.

- [ ] **Step 3: Verify the complete Create Event data flow**

On `/events/new`, enter a unique event name, city, venue, start/end dates, attendee estimate, description, categories, audience profiles, one or more manual guests covering VIP and Sponsor types, and assigned staff. Create the event and confirm every value and derived count appears on the destination Overview.

- [ ] **Step 4: Verify CSV-derived counts**

Import a small CSV with Attendee, VIP, and Sponsor guest types, create the event, and confirm total attendees, VIPs, and sponsors match the parsed rows plus any manual guests.

- [ ] **Step 5: Verify cover persistence and fallback**

Create one event with an uploaded cover and confirm it appears in the hero after navigation and after reload. Create another event without a cover and confirm the fallback artwork is polished and accessible.

- [ ] **Step 6: Verify interaction states**

Exercise Overview, Attendees, Kami, Staff, and Insights tabs; all four quick actions; View Kami settings; Edit Event; and the More disclosure. Confirm unsupported tabs show the scoped placeholder and no control routes to a missing page.

- [ ] **Step 7: Verify readiness edge cases**

Create a valid event without optional context, attendees, or staff and confirm Event context, Attendees imported, and Staff assigned show `Needs attention`, while Kami remains ready with `Default configuration`.

- [ ] **Step 8: Inspect responsive layouts**

Inspect at desktop, tablet, and phone widths. Confirm the header and actions wrap cleanly, the hero remains legible, tabs remain reachable, metrics remain scannable, cards do not create page-level horizontal overflow, and touch targets remain usable.

- [ ] **Step 9: Inspect accessibility and console output**

Keyboard through breadcrumbs, actions, disclosure, tabs, quick actions, and Kami navigation. Confirm visible focus, correct active-tab semantics, useful cover alt text, no color-only readiness meaning, and no browser console errors or hydration warnings.

- [ ] **Step 10: Review the final worktree**

Run:

```bash
git status --short
git diff --check
git diff -- 'src/app/events/[eventId]/page.tsx' src/modules/events/event-record.ts src/modules/events/components/event-detail-page.tsx src/modules/events/components/create-event-page.tsx src/modules/events/components/live-event-panel.tsx src/shared/ui/icons.tsx src/app/globals.css
```

Confirm the diff contains only the requested Event Detail implementation plus the pre-existing Create Event work it intentionally extends.
