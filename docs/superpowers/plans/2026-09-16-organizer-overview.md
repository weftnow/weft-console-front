# Organizer Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive organizer overview dashboard that faithfully translates the supplied Weft reference into a premium matte ceramic interface with shadcn Charts visualizations.

**Architecture:** Keep `app/page.tsx` as a thin Server Component, place organizer overview composition and fixture data in the insights module, and isolate shadcn Charts and interactive controls behind focused Client Component boundaries. Encode the depth model in shared surface primitives and central CSS tokens so raised, floating, inset, and pressed treatments remain consistent.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn Charts, Recharts 3, CSS custom properties, inline SVG icons.

**Spec:** `docs/superpowers/specs/2026-09-16-organizer-overview-design.md`

## Global Constraints

- The supplied screenshot is the primary visual authority.
- Material must read as warm matte ceramic under diffuse studio light.
- Avoid glossy gradients, obvious bevels, exaggerated neumorphism, glass panels, and single-shadow generic cards.
- Use shadcn Charts with Recharts 3 for analytical charts.
- Keep `app/page.tsx` thin and business-specific UI inside `modules/insights`.
- Use typed local fixture data; do not add API, auth, or persistence layers.
- Preserve semantic HTML, visible keyboard focus, and reduced-motion behavior.
- Run all shell commands through `rtk` as required by `AGENTS.md`.

---

### Task 1: Establish dependencies, metadata, and the ceramic token system

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: CSS variables `--weft-canvas`, `--weft-surface`, `--weft-surface-soft`, `--weft-surface-inset`, `--weft-text`, `--weft-text-muted`, `--weft-border`, `--weft-orange`, `--weft-orange-soft`, `--weft-shadow-raised`, `--weft-shadow-floating`, `--weft-shadow-inset`, and `--weft-shadow-pressed`.
- Produces: installed `recharts` package used by the local shadcn chart primitive.

- [ ] **Step 1: Install the approved chart libraries**

Run: `rtk pnpm add recharts`

Expected: `recharts` appears under `dependencies`, and `pnpm-lock.yaml` updates without unrelated package changes.

- [ ] **Step 2: Update document metadata and root body styling**

Set the title to `Weft Console` and description to `Networking intelligence for extraordinary events.` Keep Geist loaded through `next/font/google`, remove the dark-mode starter classes, and give the body the warm canvas class.

- [ ] **Step 3: Replace starter CSS with centralized material tokens**

Define the colors, radii, depth shadows, focus ring, typography defaults, reduced-motion behavior, and reusable utility classes for `surface-raised`, `surface-floating`, `surface-inset`, and `surface-pressed`. Build depth from a fine border, shallow contact shadow, broad ambient shadow, and quiet inner edge highlight.

- [ ] **Step 4: Verify the foundation**

Run: `rtk pnpm lint`

Expected: no lint errors.

### Task 2: Create shared tactile primitives

**Files:**
- Create: `shared/ui/surface.tsx`
- Create: `shared/ui/tactile-button.tsx`
- Create: `shared/ui/icons.tsx`

**Interfaces:**
- Produces: `Surface({ as, depth, className, children, ...props })` where `depth` is `"flat" | "raised" | "floating" | "inset"`.
- Produces: `TactileButton` with native button props, `variant: "neutral" | "accent" | "ghost"`, and optional `iconOnly`.
- Produces: named stroke-icon components used by navigation, metrics, filters, event metadata, and arrows.

- [ ] **Step 1: Implement the semantic surface primitive**

Map depth variants only to shared token-backed classes. Allow `div`, `section`, `article`, `aside`, and `nav` elements without adding business meaning.

- [ ] **Step 2: Implement the tactile button primitive**

Use a native `button`, a minimum 44-pixel target, `:hover`, `:active`, and `:focus-visible` states. The pressed state must reduce elevation, add shallow inset shading, translate by one pixel, and scale to `0.985` only when reduced motion is not requested.

- [ ] **Step 3: Implement the icon set**

Create consistent `currentColor` SVG icons with `aria-hidden="true"`, including home, calendar, network, people, outcomes, location, chevron, arrow, trend, link, and globe symbols.

- [ ] **Step 4: Verify type and lint boundaries**

Run: `rtk pnpm lint`

Expected: no lint errors, invalid DOM props, or accessibility warnings.

### Task 3: Define typed organizer overview data

**Files:**
- Create: `modules/insights/overview-data.ts`

**Interfaces:**
- Produces: `OverviewMetric`, `ConnectionPoint`, `EventPerformance`, `UpcomingEvent`, `NetworkMovement`, and `CompletedEvent` types.
- Produces: `organizerOverviewData` containing the exact values and labels represented in the approved reference.

- [ ] **Step 1: Define serializable domain-facing types**

Keep dates as display strings for this fixture-only screen, use numeric percentages for chart values, and include alt text for every meaningful local image or visual placeholder.

- [ ] **Step 2: Add the complete fixture dataset**

Include five overview metrics, six connection-quality points, five performance rows, three upcoming events, three movement locations, and one completed event. Preserve the reference labels: Events, Attendees, Introductions completed, Valuable connections, and Repeat attendees.

- [ ] **Step 3: Verify the data module**

Run: `rtk pnpm exec tsc --noEmit`

Expected: the fixture is fully typed and serializable with no TypeScript errors.

### Task 4: Build shadcn Charts client visualizations

**Files:**
- Create: `modules/insights/components/connection-quality-chart.tsx`
- Create: `modules/insights/components/repeat-attendance-chart.tsx`
- Create: `shared/ui/chart.tsx`

**Interfaces:**
- Consumes: `ConnectionPoint[]` and numeric repeat percentage from `modules/insights/overview-data.ts`.
- Produces: `ConnectionQualityChart({ points })` and `RepeatAttendanceChart({ percentage })` Client Components.

- [ ] **Step 1: Add the shadcn chart primitive and focused client boundaries**

Add the current shadcn `ChartContainer`, `ChartTooltip`, and `ChartTooltipContent` pattern backed by Recharts 3. Mark the chart primitive and two domain chart wrappers with `"use client"` while leaving the rest of the overview server-rendered.

- [ ] **Step 2: Configure the connection-quality chart**

Compose `AreaChart`, `Area`, `CartesianGrid`, `XAxis`, `YAxis`, and the shadcn tooltip to render one smooth orange series with restrained opacity, neutral grid lines, two-line category labels, ceramic-rimmed markers, and an accessible text summary.

- [ ] **Step 3: Configure the repeat-attendance chart**

Compose Recharts `RadialBarChart` through `ChartContainer` with a pale inset track, orange active arc, centered `31%` value, and a compact caption. Disable unnecessary animation when reduced motion is active.

- [ ] **Step 4: Verify production compatibility**

Run: `rtk pnpm build`

Expected: build completes without `window is not defined`, hydration, or dynamic-import errors.

### Task 5: Compose the organizer overview screen

**Files:**
- Create: `modules/insights/components/organizer-overview.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `organizerOverviewData`, shared surfaces/buttons/icons, and both ApexCharts wrappers.
- Produces: the complete organizer overview page rendered by the root route.

- [ ] **Step 1: Build navigation and global controls**

Create the desktop sidebar, mobile top navigation, user identity, active Overview state, time filter, and city filter. Use semantic navigation and buttons; keep inactive items visually flatter than the active inset selection.

- [ ] **Step 2: Build the overview hero and metric strip**

Create the heading, context line, restrained network-map SVG, and five metric items. Treat the metric region as one raised group whose children are mostly flat, with only the selected Valuable connections item receiving the soft orange accent treatment.

- [ ] **Step 3: Build analytical sections**

Compose Connection quality over time with an inset chart well and floating selector. Pair it with Network snapshot, the repeat-attendance radial chart, and a flat insight callout.

- [ ] **Step 4: Build event performance**

Use a semantic table inside a flatter or inset region. Add quiet row dividers, tabular numerals, orange progress fills in recessed tracks, row hover feedback, and horizontal overflow below tablet width.

- [ ] **Step 5: Build upcoming and recent activity**

Create upcoming event entries, attendee movement, and recently completed event sections. Use simple CSS/SVG city artwork or local decorative assets with clear alt behavior; do not introduce remote runtime image dependencies.

- [ ] **Step 6: Keep the route thin**

Replace starter content in `app/page.tsx` with a direct render of `OrganizerOverview` and no business logic.

- [ ] **Step 7: Verify static quality**

Run: `rtk pnpm lint && rtk pnpm exec tsc --noEmit && rtk pnpm build`

Expected: all commands exit successfully.

### Task 6: Tune responsive behavior and perform visual QA

**Files:**
- Modify: `app/globals.css`
- Modify: `modules/insights/components/organizer-overview.tsx`
- Modify: `modules/insights/components/connection-quality-chart.tsx`
- Modify: `modules/insights/components/repeat-attendance-chart.tsx`

**Interfaces:**
- Consumes: the completed organizer overview.
- Produces: verified desktop, tablet, and mobile presentation with consistent material depth.

- [ ] **Step 1: Run the development server**

Run: `rtk pnpm dev`

Expected: the root page loads without console or terminal errors.

- [ ] **Step 2: Review desktop at the reference proportions**

Inspect at approximately 1024 by 1536 and at 1440 by 1100. Check hierarchy, grid alignment, chart readability, table density, and whether the sidebar and panels feel physically related to the canvas.

- [ ] **Step 3: Review tablet and mobile**

Inspect at 768 by 1024 and 390 by 844. Check navigation conversion, chart labels, table overflow, card stacking, touch targets, and absence of horizontal page overflow.

- [ ] **Step 4: Tune material relationships**

Adjust only centralized color, border, and shadow tokens unless a component has a semantic reason for different depth. Remove any highlight that reads as directional or glossy. Confirm raised objects use shallow contact shadows plus diffuse ambient occlusion and inset areas remain visibly recessed.

- [ ] **Step 5: Verify keyboard and reduced motion behavior**

Tab through every control, confirm visible focus and logical order, activate filters with the keyboard, and emulate reduced motion to verify press effects and chart animation do not create unnecessary movement.

- [ ] **Step 6: Run final project checks**

Run: `rtk pnpm lint && rtk pnpm exec tsc --noEmit && rtk pnpm test && rtk pnpm build`

Expected: lint, type checking, tests, and production build pass. If `pnpm test` is absent, add a script that runs the project’s meaningful static checks rather than introducing a test framework solely for this visual screen.
