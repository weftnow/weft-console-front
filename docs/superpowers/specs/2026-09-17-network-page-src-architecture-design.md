# Network Page and `src/` Architecture Design

## Purpose

Implement the organizer-facing Network page from the supplied visual reference while correcting the repository layout so all application source lives under `src/`. The page must feel native to the existing Weft Console, preserve the current organizer overview, and use static typed fixture data only.

## Product Scope

The Network page represents the organizer's organization-level view of relationships across the We Are One event ecosystem. It helps organizers identify promising connections, inspect a person's immediate network, understand network composition, see common introduction patterns, and review repeat attendance across events.

The broader `network` capability owns:

- network exploration and relationship context,
- connection recommendations,
- introduction planning and status,
- ecosystem composition,
- cross-event relationship and attendance insights.

An introduction remains a domain concept and outcome inside the Network capability. It is not a separate top-level module in the target architecture.

The initial implementation is visual and fixture-driven. It does not add APIs, persistence, authentication, authorization enforcement, matching logic, search behavior, filtering behavior, or workflow mutations.

## Roles and Permissions

The page is an organizer-facing organization-level experience. It may display aggregate network data and attendee relationship context available to organizers.

The implementation must not imply that sponsors or event staff automatically receive the same organization-wide access. No new authorization mechanism is introduced in this visual-only phase, but the feature remains explicitly scoped to the organizer role so later data integration can enforce the correct boundary.

## Source Architecture

All application source moves under `src/`:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── network/
│       └── page.tsx
├── modules/
│   ├── insights/
│   └── network/
│       ├── components/
│       │   └── network-page.tsx
│       └── network-data.ts
└── shared/
    └── ui/
```

Configuration, documentation, tests, and static public assets remain at the repository root. The TypeScript `@/*` alias resolves to `./src/*` after the migration.

The existing root-level `app/`, `modules/`, and `shared/` directories must not remain after the migration. Next.js App Router files live in `src/app/`, which is supported by the installed Next.js version.

## Capability Ownership

`src/modules/network/` owns the Network page's fixture types, fixture values, recommendation compositions, simplified direct-network visualization, composition data, introduction-type data, and returning-attendee presentation.

`src/modules/insights/` continues to own the existing organizer overview and its analytics.

`src/shared/ui/` owns only reusable, domain-independent UI. The existing surface, tactile button, chart, and icon primitives remain shared. The Console sidebar becomes shared because both Overview and Network use the same application navigation and user context. Its API accepts the active destination rather than deriving business state inside either feature module.

Route files remain thin:

- `src/app/page.tsx` renders the organizer overview.
- `src/app/network/page.tsx` renders the Network page.

## Shared Navigation

Extract the existing sidebar into a reusable Console navigation component without redesigning it. Preserve the Weft brand treatment, organizer identity, responsive collapse behavior, raised container, and inset active state.

Overview links to `/` and Network links to `/network` through Next.js `Link`. Other destinations retain their existing non-functional or placeholder behavior; this implementation does not create additional routes.

The active item must communicate selection through depth, typography, and the existing orange accent, not color alone.

## Network Page Information Hierarchy

The page follows this sequence:

1. Page context, title, supporting copy, filters, and search.
2. Four organization-level metrics.
3. High-potential introduction recommendations.
4. Direct Network Explorer paired with network composition and introduction-type insights.
5. Full-width returning-attendees table.

The recommendation section is the primary region. Its visual weight should exceed the secondary analytics without relying on a large orange area.

## Page Header

The header contains:

- context label: `Network`,
- title: `The We Are One Network`,
- supporting copy describing people, introductions, and opportunities across events,
- `All time` control,
- `All events` control,
- visual search field for people, companies, or roles.

The controls reuse the current tactile and inset surface language. They remain non-functional in this phase while preserving semantic control elements and visible focus states.

## Summary Metrics

Render four raised metric cards with typed fixture data:

- `1,842` People,
- `923` Introductions,
- `68%` Valuable connections,
- `412` Returning attendees.

Icons sit in restrained inset wells. Typography and spacing carry the hierarchy; orange is used only where a metric or network signal requires emphasis.

## People Who Should Meet

Render approximately three visible recommendation cards using typed fixture data. Each card contains:

- two distinct attendee portraits,
- both names,
- roles and companies,
- relevant category tags,
- match percentage,
- concise explanation of why they should meet,
- shared event context,
- `Not introduced` status,
- `Plan introduction` primary action.

The recommendation container is raised. The cards inside it use quieter nested treatment so the page does not become a stack of equally elevated surfaces. Match percentages use restrained orange emphasis. The primary action uses the existing tactile button behavior and does not trigger a mutation.

Portraits are local static assets with meaningful alt text and stable dimensions. Each distinct person uses a distinct image.

## Network Explorer

The Network Explorer is a simplified relationship diagram, not a graph engine. It contains:

- an inset visual person selector,
- one selected attendee centered in the visualization,
- four directly connected people arranged around the selected attendee,
- simple decorative connecting lines,
- names and role/company context,
- selected attendee category,
- introduction count,
- events-together count,
- most recent shared event.

The layout uses semantic content and CSS/SVG positioning only. It does not add graph dependencies, drag behavior, zooming, search, or relationship calculations. On narrow screens it becomes a readable stacked relationship list instead of shrinking the desktop diagram into an unusable miniature.

## Network Composition

Show a restrained donut visualization for:

- Founders,
- Investors,
- Brands,
- Executives,
- Media,
- Family Offices,
- Others.

The center displays `1,842 People`. The visualization uses the existing graphite neutral family with Weft orange reserved for the primary category. A CSS conic gradient is sufficient because the data is static and no chart interaction is required. The donut includes a textual legend so category meaning never depends on color alone.

## Most Common Introduction Types

Render rows for:

- Founder ↔ Investor,
- Founder ↔ Brand,
- Investor ↔ Investor,
- Founder ↔ Founder,
- Brand ↔ Investor.

Each row includes a label, count, recessed progress track, and restrained orange fill. The track reuses the shared inset shadow token rather than adding a feature-specific shadow recipe.

## Returning Attendees

The full-width section contains a semantic table with:

- event,
- total attendees,
- returning attendees,
- return rate.

Fixture rows include Miami Art Week, Monaco GP, Las Vegas, and Singapore. Event thumbnails are local decorative assets or existing CSS artwork with stable dimensions. Numeric columns use tabular figures. Return-rate bars use inset tracks and orange fills. The table scrolls horizontally only when necessary on small screens and retains a strong first column.

## Visual System

The existing Weft implementation is authoritative. Reuse:

- `Surface`,
- `TactileButton`,
- current icons where available,
- CSS color, radius, depth, and motion tokens,
- Geist typography,
- current sidebar and responsive breakpoints,
- current table and progress-track patterns.

Add feature-specific classes to `src/app/globals.css` only when existing classes cannot express the required composition. Do not introduce a new color palette, shadow system, radius scale, component library, CSS framework, or dependency.

Depth remains semantic:

- canvas for the page background,
- raised for major sections and metric cards,
- floating for important controls and actions,
- inset for search/select wells, icon wells, progress tracks, and embedded data areas.

Nested content should usually be flat or inset. Orange remains sparse and meaningful.

## Responsive Behavior

Desktop uses the existing sidebar and a dense editorial grid. The recommendation cards show three across where space permits. Network Explorer occupies the larger left column, while composition and introduction types stack in the right column.

Tablet collapses recommendations and secondary analytics into fewer columns while preserving touch targets and readable type.

Mobile uses the existing compact top navigation treatment. Recommendation cards become a horizontal snap region or a single-column stack, the Network Explorer becomes a vertical relationship list, metrics become a horizontal scroller, and the returning-attendees table uses contained overflow. No page-level horizontal overflow is allowed.

## Accessibility and Interaction

- Use semantic headings, sections, articles, navigation, buttons, inputs, and tables.
- Preserve visible `:focus-visible` treatment.
- Provide useful alt text for attendee portraits and event imagery.
- Do not use color alone for match, status, category, or progress meaning.
- Maintain minimum 44-pixel touch targets for actionable controls.
- Respect the existing reduced-motion rule.
- Visual-only controls must not falsely claim that data changed.

## Documentation Changes

Update `ARCHITECTURE.md` so its canonical tree and examples use `src/app`, `src/modules`, `src/shared`, and `src/infrastructure`. Replace the top-level `introductions` capability with `network`, and use network-oriented examples while clarifying that introduction operations belong within Network.

Update design-system source-path examples from `shared/ui/` to `src/shared/ui/` where they describe repository locations rather than conceptual namespaces.

Historical implementation specifications remain historical records and do not need mechanical path rewrites.

## Verification

No new test suite or feature tests are added for this visual-only page. The existing inset-depth test is updated only so it reads files from their new `src/` locations.

Before completion:

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `pnpm test`.
4. Run `pnpm build`.
5. Inspect `/` and `/network` at desktop and mobile widths.
6. Verify Overview remains intact.
7. Verify Overview and Network navigation states and links.
8. Verify no application source remains in root-level `app/`, `modules/`, or `shared/` directories.
9. Verify organizer-only scope is documented and no sponsor or staff permission claim was introduced.

## Out of Scope

- Backend or API integration
- Persistence
- Authentication or authorization implementation
- Real matching or recommendation logic
- Real search or filters
- Introduction workflow mutations
- Additional application routes
- A People Directory section
- New dependencies
- New feature tests
- Generic graph infrastructure
- Speculative shared abstractions
