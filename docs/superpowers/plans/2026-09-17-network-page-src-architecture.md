# Network Page and `src/` Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all Weft application source under `src/`, establish Network as the owning capability for introductions and relationships, and implement the organizer-facing `/network` page from the approved visual reference.

**Architecture:** Migrate the existing App Router, insights module, and shared UI into `src/`, then keep both route files thin. Extract application navigation into a shared server component, place typed fixture data and visual composition inside `src/modules/network/`, and rely on existing Weft surface and tactile primitives for the new page.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Tailwind CSS 4, CSS custom properties, Next.js Image, inline SVG, static local fixture data.

**Spec:** `docs/superpowers/specs/2026-09-17-network-page-src-architecture-design.md`

## Global Constraints

- All application source must live under `src/`; root-level `app/`, `modules/`, and `shared/` must not remain.
- Replace the top-level `introductions` capability with `network`; introductions remain a domain concept owned by Network.
- Preserve the existing organizer overview at `/`.
- Add the Network page at `/network` for the organizer role.
- Use typed local fixture data only.
- Do not add APIs, persistence, authentication, authorization enforcement, real matching, search, filtering, or mutations.
- Reuse the current Weft tokens, typography, spacing, radii, shadows, buttons, surfaces, icons, navigation, tables, and responsive patterns.
- Do not add dependencies or create a parallel design system.
- Do not add feature tests; update the existing source-path assertions only when required by the `src/` migration.
- Keep orange sparse and use raised, floating, inset, and pressed depth semantically.

---

### Task 1: Migrate application source into `src/`

**Files:**
- Move: `app/` → `src/app/`
- Move: `modules/` → `src/modules/`
- Move: `shared/` → `src/shared/`
- Modify: `tsconfig.json`
- Modify: `src/app/page.tsx`
- Modify: `src/modules/insights/components/organizer-overview.tsx`
- Modify: `src/modules/insights/components/connection-quality-chart.tsx`
- Modify: `src/modules/insights/components/repeat-attendance-chart.tsx`
- Modify: `tests/inset-depth.test.mjs`

**Interfaces:**
- Produces: `@/*` resolving to `./src/*`.
- Produces: the existing overview route rendered from `src/app/page.tsx`.
- Preserves: all current overview behavior and the existing inset-depth assertions.

- [ ] **Step 1: Record the clean baseline**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: all existing checks pass before moving source.

- [ ] **Step 2: Move the three source roots**

Create `src/` and move `app`, `modules`, and `shared` into it without changing their internal structure. Confirm these paths exist afterward:

```text
src/app/layout.tsx
src/app/page.tsx
src/modules/insights/components/organizer-overview.tsx
src/shared/ui/surface.tsx
```

- [ ] **Step 3: Point the TypeScript alias at `src/`**

Set:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 4: Convert application imports to the source alias**

Use these canonical imports:

```tsx
import { OrganizerOverview } from "@/modules/insights/components/organizer-overview";
import { ChartContainer, type ChartConfig } from "@/shared/ui/chart";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
```

Do not leave parent-directory imports crossing module or shared boundaries.

- [ ] **Step 5: Update the existing test's file locations**

Change the three file URLs to:

```js
new URL("../src/app/globals.css", import.meta.url)
new URL("../src/modules/insights/components/organizer-overview.tsx", import.meta.url)
new URL("../src/modules/insights/components/repeat-attendance-chart.tsx", import.meta.url)
```

- [ ] **Step 6: Verify the migration**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: the overview builds and all checks pass from `src/`; `find app modules shared -type f` reports no root source trees.

- [ ] **Step 7: Commit the source migration**

```bash
git add src tsconfig.json tests/inset-depth.test.mjs app modules shared
git commit -m "refactor: move application source under src"
```

### Task 2: Update architecture and design-system documentation

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `docs/design/design-system.md`

**Interfaces:**
- Produces: a canonical `src/app`, `src/modules`, `src/shared`, and `src/infrastructure` architecture tree.
- Produces: Network capability ownership for recommendations, relationships, and introduction operations.

- [ ] **Step 1: Replace the canonical architecture tree**

Document this capability structure:

```text
src/
├── app/
├── modules/
│   ├── events/
│   ├── attendees/
│   ├── network/
│   ├── sponsors/
│   ├── staff/
│   ├── insights/
│   └── organizations/
├── shared/
└── infrastructure/
```

- [ ] **Step 2: Replace introduction-module examples with Network examples**

Use examples such as:

```text
src/modules/network/
├── components/
│   ├── connection-recommendation-card.tsx
│   ├── network-explorer.tsx
│   └── introduction-status-badge.tsx
├── queries/
│   ├── get-network-overview.ts
│   └── get-connection-recommendations.ts
├── mutations/
│   └── plan-introduction.ts
└── types.ts
```

State explicitly that introductions are domain operations inside Network, not a separate top-level capability.

- [ ] **Step 3: Correct repository-location examples in the design system**

Change source-location examples from `shared/ui/` to `src/shared/ui/` and feature examples to `src/modules/network/components/`. Do not rewrite historical spec or plan files.

- [ ] **Step 4: Verify documentation consistency**

Run:

```bash
rg -n "modules/introductions|features/network|^shared/ui/|^app/" ARCHITECTURE.md docs/design/design-system.md
```

Expected: no canonical source-path example points at the old root source layout, and no top-level introductions module remains.

- [ ] **Step 5: Commit documentation changes**

```bash
git add ARCHITECTURE.md docs/design/design-system.md
git commit -m "docs: establish network capability architecture"
```

### Task 3: Extract shared Console navigation

**Files:**
- Create: `src/shared/ui/console-sidebar.tsx`
- Modify: `src/modules/insights/components/organizer-overview.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `ConsoleSidebar({ active }: { active: "overview" | "network" })`.
- Consumes: existing shared icons and `Surface`.
- Preserves: current desktop sidebar, compact mobile navigation, brand treatment, organizer profile, and active pressed state.

- [ ] **Step 1: Create the shared server component**

Define supported navigation entries with stable keys and hrefs:

```ts
type ConsoleDestination = "overview" | "network";

const navigation = [
  { key: "overview", label: "Overview", href: "/", icon: HomeIcon },
  { key: "events", label: "Events", href: "#events", icon: CalendarIcon },
  { key: "network", label: "Network", href: "/network", icon: NetworkIcon },
  { key: "people", label: "People", href: "#people", icon: PeopleIcon },
  { key: "outcomes", label: "Outcomes", href: "#outcomes", icon: OutcomesIcon },
] as const;
```

Render `Link` for `/` and `/network`, ordinary anchors for existing placeholder hashes, and `aria-current="page"` only when the entry matches `active`.

- [ ] **Step 2: Move the existing sidebar markup without redesigning it**

Move the current brand, navigation, brand story, and organizer profile markup into `ConsoleSidebar`. Keep the existing class names so the current CSS remains authoritative.

- [ ] **Step 3: Replace the overview-local sidebar**

Delete the local navigation constant and `Sidebar` function from `organizer-overview.tsx`, import `ConsoleSidebar`, and render:

```tsx
<ConsoleSidebar active="overview" />
```

- [ ] **Step 4: Make Link and anchor states visually identical**

Confirm `.nav-link`, `.nav-link--active`, and `.surface-pressed` styles apply to both element types. Add no new shadow values.

- [ ] **Step 5: Verify the shared navigation**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: the overview remains unchanged and the test still finds `nav-link--active surface-pressed` in the shared sidebar source; update that existing assertion's source file if necessary.

- [ ] **Step 6: Commit shared navigation**

```bash
git add src/shared/ui/console-sidebar.tsx src/modules/insights/components/organizer-overview.tsx src/app/globals.css tests/inset-depth.test.mjs
git commit -m "refactor: share console navigation"
```

### Task 4: Create local portrait assets and typed Network fixtures

**Files:**
- Create: `public/network/avatars/sarah-chen.png`
- Create: `public/network/avatars/michael-ross.png`
- Create: `public/network/avatars/emma-laurent.png`
- Create: `public/network/avatars/daniel-park.png`
- Create: `public/network/avatars/alex-rivera.png`
- Create: `public/network/avatars/sofia-martinez.png`
- Create: `public/network/avatars/david-kim.png`
- Create: `public/network/avatars/anna-rossi.png`
- Create: `public/network/avatars/james-wong.png`
- Create: `src/modules/network/network-data.ts`

**Interfaces:**
- Produces: `NetworkMetric`, `NetworkPerson`, `ConnectionRecommendation`, `DirectConnection`, `NetworkCompositionItem`, `IntroductionType`, and `ReturningEvent` types.
- Produces: `networkPageData` containing all static page content.

- [ ] **Step 1: Generate the portrait atlas**

Use the image-generation tool to create one square 3-by-3 atlas with nine distinct, premium editorial business portraits. Require even cells, centered head-and-shoulders framing, warm neutral studio backgrounds, soft directional light, no text, no logos, and demographic variety matching the fixture names.

- [ ] **Step 2: Split and inspect the atlas**

Crop the atlas into nine equal square PNG files named above. Inspect the individual crops and regenerate only if a face crosses a cell boundary, a person repeats, or framing is inconsistent.

- [ ] **Step 3: Define the person and recommendation fixtures**

Include these recommendation pairs and values:

```ts
Sarah Chen ↔ Michael Ross: 92%, Las Vegas 2026
Emma Laurent ↔ Daniel Park: 88%, London 2026
Alex Rivera ↔ Sofia Martinez: 85%, Miami 2026
```

Each person receives a role, company, category, avatar path, and descriptive alt text. Explanations remain concise and specific to the pair.

- [ ] **Step 4: Define explorer and analytics fixtures**

Select Sarah Chen as the center person with David Kim, Anna Rossi, Michael Ross, and James Wong as direct connections. Add `3` introductions, `2` events together, and `Miami 2026` as the latest shared event.

Add composition values summing to `1,842`, five introduction-type counts, and returning-event rows for Miami Art Week, Monaco GP, Las Vegas, and Singapore.

- [ ] **Step 5: Verify fixture typing and assets**

Run:

```bash
pnpm typecheck
find public/network/avatars -type f
```

Expected: nine distinct PNGs exist and `networkPageData` is fully typed without casts that hide missing fields.

- [ ] **Step 6: Commit fixture data and assets**

```bash
git add public/network/avatars src/modules/network/network-data.ts
git commit -m "feat(network): add organizer network fixtures"
```

### Task 5: Compose the Network page and route

**Files:**
- Create: `src/modules/network/components/network-page.tsx`
- Create: `src/app/network/page.tsx`
- Modify: `src/shared/ui/icons.tsx`

**Interfaces:**
- Produces: `NetworkPage()` server component.
- Consumes: `networkPageData`, `ConsoleSidebar`, `Surface`, `TactileButton`, Next.js `Image`, and shared icons.
- Produces: a thin `/network` route with no business logic.

- [ ] **Step 1: Add only missing shared stroke icons**

Add icons for search, sparkles, close, return, and introduction planning using the existing `IconBase`, `currentColor`, 24-pixel view box, rounded strokes, and `1.8` stroke width. Do not add another icon package.

- [ ] **Step 2: Build the Network shell and header**

Render the shared sidebar with:

```tsx
<ConsoleSidebar active="network" />
```

Add the Network context label, `The We Are One Network` heading, supporting description, two tactile filter controls, and an inset search field with a visible label available to assistive technology.

- [ ] **Step 3: Build the four metrics**

Map `networkPageData.metrics` into four raised articles. Use an inset circular icon well, tabular metric value, strong label, and muted description.

- [ ] **Step 4: Build recommendation cards**

Map all three recommendations. Use Next.js `Image` with stable dimensions for both portraits, render tags and match percentage, align the explanation region across cards, and place shared-event state, introduction state, and the accent tactile action along the bottom.

- [ ] **Step 5: Build Network Explorer**

Render an inset visual selector, a desktop diagram with a selected center person and four connection cards, an `aria-hidden` SVG connector layer, and a compact inset summary strip. Render the same connection data as a readable list at mobile widths through CSS layout changes rather than adding graph behavior.

- [ ] **Step 6: Build composition and introduction-type panels**

Render the static donut with a CSS custom property containing the approved conic gradient. Pair it with a complete text legend. Render introduction-type rows with tabular counts and inset progress tracks whose widths derive from the fixture values.

- [ ] **Step 7: Build the returning-attendees table**

Render a semantic table with event artwork, total attendees, returning attendees, percentage text, and an inset progress bar. Reuse the existing `city-art` CSS artwork by passing each event's theme through CSS custom properties.

- [ ] **Step 8: Keep the route thin**

Use:

```tsx
import { NetworkPage } from "@/modules/network/components/network-page";

export default function Page() {
  return <NetworkPage />;
}
```

- [ ] **Step 9: Verify static composition**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: `/network` is statically renderable with no client boundary, remote image configuration, or runtime data dependency.

- [ ] **Step 10: Commit the page composition**

```bash
git add src/app/network/page.tsx src/modules/network/components/network-page.tsx src/shared/ui/icons.tsx
git commit -m "feat(network): add organizer network page"
```

### Task 6: Add responsive visual styling and complete visual QA

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/modules/network/components/network-page.tsx`

**Interfaces:**
- Consumes: the completed static Network page.
- Produces: desktop, tablet, and mobile layouts using the existing Weft material tokens and breakpoints.

- [ ] **Step 1: Add Network-specific layout classes**

Style the page with these relationships:

```text
network header: content plus three compact controls
metrics: four equal columns
recommendations: three columns inside one raised section
analysis: wide explorer plus narrow stacked insights
returning attendees: full width
```

Use existing radius and shadow tokens only. Nested recommendation cards should be flatter than their parent section.

- [ ] **Step 2: Tune tactile hierarchy**

Use inset treatment for search, selector, progress tracks, icon wells, and embedded visualization surfaces. Use floating treatment for filters, compact actions, and the primary Plan introduction action. Keep orange limited to active navigation, match values, network glyphs, donut emphasis, progress fills, and primary actions.

- [ ] **Step 3: Add responsive transformations**

At existing breakpoints:

- collapse the header controls below the title,
- turn metrics into the existing horizontal snap pattern on mobile,
- reduce recommendations to two columns and then one horizontal snap row,
- stack explorer and insight panels,
- convert the explorer diagram to a vertical connection list,
- retain contained table overflow without page overflow.

- [ ] **Step 4: Run the development server and inspect desktop**

Run:

```bash
pnpm dev
```

Inspect `/` and `/network` at approximately 1440×1100. Confirm the existing overview is unchanged, the Network page hierarchy is legible within three seconds, card edges align, and recommendation actions share a baseline.

- [ ] **Step 5: Inspect tablet and mobile**

Inspect `/network` at approximately 768×1024 and 390×844. Confirm readable text, 44-pixel controls, usable horizontal regions, clean explorer fallback, and no page-level horizontal overflow.

- [ ] **Step 6: Check accessibility and interaction states**

Tab through the page, confirm visible focus, verify all portrait alt text, confirm donut and progress values have text equivalents, and emulate reduced motion to ensure the interface remains coherent.

- [ ] **Step 7: Run final verification**

Run each command separately:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit successfully.

Run:

```bash
test ! -d app
test ! -d modules
test ! -d shared
git diff --check
```

Expected: source roots exist only under `src/` and no whitespace errors remain.

- [ ] **Step 8: Commit visual polish**

```bash
git add src/app/globals.css src/modules/network/components/network-page.tsx
git commit -m "style(network): polish responsive tactile layout"
```
