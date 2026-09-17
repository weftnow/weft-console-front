# Event Detail Overview Design

## Purpose

Implement the organizer-facing Overview tab for a single event and connect it to the existing Create Event demo. The page must immediately communicate event identity, readiness, attendance, context, Kami status, and useful next actions while remaining native to the established Weft Console.

The supplied screenshot is a composition reference only. Existing Weft typography, spacing, radii, shadows, navigation, buttons, surfaces, motion, and responsive conventions remain authoritative.

## Product Scope

This page is an event-level organizer experience. It combines information owned by Events with lightweight attendee and staff summaries captured during event creation.

The implementation adds browser-local demo persistence only. It does not add APIs, a database, authentication, authorization infrastructure, attendee onboarding, networking outcomes, follow-up workflows, or speculative event-management features.

## Roles and Permissions

The page is explicitly scoped to an organizer. It may show the complete event summary, imported attendee totals, assigned staff count, readiness, and organizer actions.

The implementation must not imply that event staff or sponsors receive the same access. No new authorization system is introduced in this demo, but the route and component remain organizer-facing so a future data source can enforce that boundary.

## Route and Page Boundary

Add a dynamic App Router route at:

```text
src/app/events/[eventId]/page.tsx
```

The route remains thin, awaits the Next.js 16 `params` promise, and passes `eventId` into an Events-owned client component. The client boundary is necessary because demo records are stored in browser storage.

The detail composition lives at:

```text
src/modules/events/components/event-detail-page.tsx
```

The existing Create Event component remains the owner of form interaction. Shared persistence and formatting behavior lives in the Events module rather than the route or shared UI layer.

## Event Record and Persistence

Create an Events-owned demo record type that preserves:

- event identifier,
- event name,
- city,
- venue,
- start and end dates,
- optional start and end times,
- expected attendee estimate,
- cover image data URL,
- description,
- categories,
- expected audience profiles,
- imported attendee total,
- VIP count,
- sponsor count,
- manually added guests and their guest types,
- assigned staff snapshots,
- creation and update timestamps.

Persist created records in `localStorage` under one versioned Weft key. Storage helpers must validate parsed values defensively and fall back to seeded event data when a record is absent or malformed.

Before persistence, convert an uploaded cover image to a durable data URL. Scale large raster images to a restrained maximum dimension and encode them at a practical browser-friendly quality so ordinary demo uploads do not exceed local-storage limits. If normalization fails, create the event without the cover and let the detail page use its fallback artwork.

The Create Event submit action must:

1. validate the existing required basics,
2. normalize the cover image when present,
3. combine CSV aggregates and manually added guests into attendee, VIP, and sponsor totals,
4. persist the complete event record,
5. navigate to `/events/[eventId]` with `router.push`.

The event identifier is a URL-safe slug derived from the event name with a short collision-safe suffix only when required.

`Save as draft` keeps its current lightweight behavior and does not navigate to the detail page.

## Seeded Event

Provide a complete seeded Las Vegas event matching the existing Events data closely enough that `/events/las-vegas-f1-week` is useful without first completing the form. The seed includes event context, audience, attendee type counts, assigned staff, and activity timestamps.

The existing `Open event` action for the live event becomes a Next.js link to the seeded detail route. No other Events page data source is restructured for this task.

## Page Information Hierarchy

The Overview follows this sequence:

1. Breadcrumb, event identity, status, date, venue, city, and event actions.
2. Cover-image hero or an elegant city-art fallback.
3. Event-level tab navigation.
4. Primary attendee, VIP, sponsor, and assigned-staff metrics.
5. Main grid with event summary and recent activity on the left.
6. Readiness, quick actions, and Kami status on the right.

The layout should feel spacious and editorial rather than like a wall of equally weighted cards.

## Event Header and Hero

The header contains:

- breadcrumb link back to Events,
- event name,
- derived status badge,
- formatted date range,
- venue and city,
- neutral `Edit event` action,
- compact `More` disclosure menu.

Status is derived from the event dates when possible: upcoming before the start date, live within the event range, and completed after the end date. Seed data may supply a stable demonstration date when needed.

The hero uses the persisted cover image when available. It is a restrained visual surface with a subtle load transition and no invented marketing copy. Without a cover image, reuse `CityArtwork` with a city-appropriate or neutral fallback treatment.

## Secondary Navigation

Render event tabs for:

- Overview,
- Attendees,
- Kami,
- Staff,
- Insights.

Overview is active on the implemented route and uses the current selected/inset navigation language. The remaining tabs are event-scoped links using a lightweight query parameter. Since their full screens are outside this task, activating one shows a concise, calm placeholder with a direct way back to Overview instead of routing to a missing page.

Quick actions and `View Kami settings` use the same tab mechanism, so every visible action has deterministic demo behavior without creating unsupported routes.

## Primary Metrics

Render four compact metric surfaces:

- total attendees,
- VIPs,
- sponsors,
- staff assigned.

For a created event, total attendees are the imported CSV row count plus manually added guests. VIP and sponsor counts combine CSV guest-type counts with matching manual guest types. If no attendee records exist, the expected attendee estimate may be shown as the attendee value with language that clearly identifies it as expected rather than imported.

Metric values use tabular numerals and a restrained appearance transition. Typography carries the hierarchy; icons and color remain secondary.

## Event Summary

The summary shows:

- formatted date range,
- venue and city,
- description,
- categories,
- expected audience.

Categories and audience values reuse the same pill shape and selected-surface language established in Create Event. The inner information region should be flat or lightly inset inside a raised section rather than another strongly elevated card.

Missing optional values use concise neutral copy rather than empty decorative placeholders.

## Event Readiness

Derive five readiness rows:

- Event details: complete when event name, city, start date, and end date exist.
- Event context: complete when a description and at least one category exist.
- Attendees imported: complete when at least one imported or manually added attendee exists.
- Staff assigned: complete when at least one staff member exists.
- Kami ready: always ready with `Default configuration`.

Incomplete rows use `Needs attention`; complete rows use `Complete`. Readiness must not mention attendee onboarding.

Kami readiness is unconditional and must never block the event-ready state.

## Quick Actions

Include:

- Manage attendees,
- View attendee list,
- Manage staff,
- View event insights.

Each action switches to its corresponding lightweight event tab state. Controls reuse tactile button behavior with restrained hover and press feedback.

## Recent Activity

Build a short derived activity list from the event record:

- attendee list imported when attendee data exists,
- staff member assigned when staff exists,
- event details updated for a complete record,
- event created.

Use stored timestamps where available and concise relative labels such as `Just now`. The activity section is secondary, compact, and does not imply a durable audit log.

## Kami Card

Show a compact raised section stating `Kami is ready` with supporting copy that Kami will be active for the event using the default configuration.

`View Kami settings` switches to the event's lightweight Kami tab state. No mandatory configuration step, setup warning, or readiness blocker is introduced.

## Visual System

Reuse:

- `ConsoleSidebar`,
- `Surface`,
- `TactileButton`,
- existing stroke icon conventions,
- Geist typography,
- current canvas, surface, border, radius, shadow, and focus tokens,
- current chip, status, metric, and responsive patterns,
- current CSS motion and reduced-motion behavior.

Depth remains semantic:

- canvas for the page,
- raised for the hero frame and major sections,
- floating for actions and compact controls,
- inset for the selected tab and nested information wells,
- flat for most content inside raised sections.

Do not add a second token system, a dependency, strong glass effects, exaggerated shadows, large orange areas, or equal elevation on every card.

## Motion

Use short CSS transitions already consistent with the product:

- hero image fade/scale settle,
- tab content fade/translate,
- metric value arrival,
- readiness check appearance,
- quick-action hover and press,
- subtle interactive-card lift where appropriate.

Motion remains fast, interruptible, and non-bouncy. The existing `prefers-reduced-motion` rule disables nonessential transitions and animations.

## Responsive Behavior

Desktop retains the persistent sidebar and uses a wide main-content column with a narrower operational rail.

At medium widths, the operational rail moves below the primary content while keeping readiness and quick actions easy to scan.

On mobile:

- the existing compact navigation treatment remains authoritative,
- header actions wrap without obscuring event identity,
- the hero keeps a usable wide aspect ratio,
- event tabs scroll horizontally,
- metrics become a two-column grid or horizontal snap strip,
- all content stacks into a single column,
- touch targets remain at least 44 pixels,
- no page-level horizontal overflow is allowed.

## Accessibility

- Use semantic landmarks, headings, navigation, sections, lists, links, buttons, and disclosure markup.
- Preserve visible focus treatment.
- Provide useful cover-image alt text and hide decorative fallback artwork from assistive technology where appropriate.
- Use labels and icons together for readiness and status; color is not the only signal.
- Expose the active event tab with `aria-current` or `aria-selected` semantics.
- Keep action labels on one line at desktop and readable on mobile.

## Error and Empty States

- Malformed or unavailable browser storage falls back to the seeded event instead of crashing.
- A missing cover image uses existing city artwork.
- Missing venue, description, categories, audience, attendees, or staff produce concise neutral empty states.
- Cover-image persistence failure must not prevent event creation.
- Browser-storage quota failure produces a visible error toast and keeps the user on Create Event so entered data is not silently lost.

## Verification

No new feature tests are required by the request. Existing checks remain mandatory:

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `pnpm test`.
4. Run `pnpm build` when the earlier checks pass.
5. Exercise Create Event with text, chips, imported CSV counts, manual guests, assigned staff, and a cover image.
6. Verify successful creation navigates to the matching detail page and every persisted value appears correctly.
7. Reload the detail route and verify the browser-local event remains available.
8. Inspect the seeded event route, cover fallback, readiness derivation, tab interactions, quick actions, More disclosure, and Kami state.
9. Inspect desktop, tablet, and mobile widths for hierarchy, overflow, focus, and touch targets.
10. Confirm existing Events, Overview, and Network screens remain intact.

## Out of Scope

- Backend persistence or APIs
- Authentication or new authorization infrastructure
- Attendee onboarding status
- Full Attendees, Kami, Staff, or Insights implementations
- Event editing workflow
- Event deletion, duplication, or archival mutations
- Post-event relationship tracking, opportunities, or follow-ups
- New dependencies
- New feature test files
