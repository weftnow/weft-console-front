# Create Event Demo Implementation Plan

> **For agentic workers:** Execute inline in the current workspace. Do not dispatch subagents for this task.

**Goal:** Add a polished, interactive Create Event demo to the existing Weft Console.

**Architecture:** Keep the App Router page thin and place the interactive experience inside the Events capability. The client component owns temporary form, upload, CSV parsing, staff selection, summary, and toast state; shared console primitives and global design tokens remain the visual source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 global CSS, browser File APIs.

**Spec:** User-approved Create Event brief in the current conversation.

## Global Constraints

- Do not add backend APIs, persistence, dependencies, or test files.
- Reuse the existing Weft shell, components, tokens, shadows, radii, typography, and responsive conventions.
- Keep all demo state local to the Create Event experience.
- Use CSS transitions and the existing tactile interaction system because the project has no animation library.
- Preserve explicit organizer-only authorship of the event creation flow.

---

### Task 1: Route and navigation

**Files:**
- Create: `src/app/events/new/page.tsx`
- Modify: `src/modules/events/components/events-page.tsx`

- [ ] Add a thin metadata-bearing `/events/new` route that renders the Events-owned client page.
- [ ] Change the existing New event action into a Next.js link with the current tactile primary styling.

### Task 2: Interactive event creation experience

**Files:**
- Create: `src/modules/events/components/create-event-page.tsx`

- [ ] Model local form state for basics, context, audience, attendees, and assigned staff.
- [ ] Add accessible labeled form fields whose material state follows empty, filled, focus, and invalid values.
- [ ] Add interactive category and audience multi-select controls with removable selected values.
- [ ] Add cover-image choose, preview, replace, remove, and object-URL cleanup behavior.
- [ ] Add CSV choose/drop, lightweight local parsing, imported counts, replace, remove, and error feedback.
- [ ] Add manual-attendee mode and a small local attendee entry form.
- [ ] Add staff assignment popover with hardcoded people and animated avatar updates.
- [ ] Add a sticky live summary that reflects every relevant state change.
- [ ] Add Create Event and Save as Draft validation/toast feedback without persistence.

### Task 3: Weft-native responsive styling

**Files:**
- Modify: `src/app/globals.css`

- [ ] Add create-event-only layout, section, field, selector, uploader, summary, staff, popover, and toast styles.
- [ ] Reuse the established ceramic palette and elevation variables for inset/raised state changes.
- [ ] Add short transform/opacity/shadow transitions and reduced-motion fallbacks.
- [ ] Add explicit desktop, tablet, and phone layouts with the summary moving into the content flow below 1120px.

### Task 4: Verification

- [ ] Run `pnpm lint`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Launch the app and inspect `/events/new` at desktop and mobile widths.
- [ ] Exercise text updates, selectors, staff assignment, image upload/remove, CSV upload/remove, and both actions.
- [ ] Review visible copy, focus states, contrast, overflow, and reduced-motion behavior.
