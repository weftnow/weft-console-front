# Organizer Overview Design

## Purpose

Build the first Weft Console screen as an organizer-facing overview of the network created across an event series. The screen should let an organizer understand the scale, quality, recurrence, and movement of their network within a few seconds.

The supplied desktop reference is the primary visual authority. The implementation should preserve its hierarchy and calm density while using the project design system rather than copying every decorative detail literally.

## Product Scope

The page represents the organization/network level for an organizer. It includes:

- global time and city filters,
- organization-wide network metrics,
- connection quality over time,
- repeat-attendance data,
- recent event performance,
- upcoming events,
- attendee movement between cities,
- the latest completed event summary.

The initial implementation uses typed local fixture data. Filters and compact actions behave in the browser, but no API, persistence, authentication, or authorization service is added. The role shown is Organizer, and the page must not imply sponsor or staff access to organizer-wide data.

## Information Hierarchy

The desktop screen follows this order:

1. Persistent navigation and user context.
2. Global time and city filters.
3. Overview statement and network footprint.
4. Five high-level metrics.
5. Primary connection-quality chart and repeat-attendance summary.
6. Event performance table.
7. Upcoming events.
8. Cross-event movement and recently completed event.

On narrow screens, the navigation becomes a compact top bar, metrics become a horizontally scrollable strip or a two-column grid, and dense sections stack without shrinking into miniature desktop widgets.

## Material Direction

The target is premium tactile matte material with an almost ceramic finish under diffuse studio lighting.

Material depth comes from:

- warm tonal separation between the canvas and surfaces,
- fine, nearly uniform edge highlights,
- compact contact shadows immediately beneath raised objects,
- broad, low-opacity ambient occlusion,
- subtle inner shading for recessed chart wells and tracks,
- small differences in surface color and texture,
- restrained corner radii that become smaller at nested levels.

The design must avoid conspicuous directional highlights, diagonal cast shadows, glossy reflections, strong gradients, inflated clay forms, and generic white cards with a single drop shadow.

The depth model is:

```text
warm canvas
  -> raised navigation and major panels
    -> flat content regions
    -> inset chart/table/progress wells
    -> floating filters and controls
      -> pressed state moves toward the parent surface
```

Not every section is raised. Nested content inside a raised panel is flat or inset unless it is an interactive control.

## Visual Tokens

The implementation centralizes the following token families in `app/globals.css`:

- warm canvas, surface, soft surface, inset surface, graphite text, muted text, border, orange, and soft orange colors,
- four radii for compact controls through major panels,
- raised, floating, inset, and pressed shadow recipes,
- spacing and type values used repeatedly by the overview.

Orange is limited to active navigation, the selected metric, chart series, progress fills, status details, and primary links. Typography and spacing carry the hierarchy before color or shadow.

## Components and Boundaries

`app/page.tsx` remains a thin Server Component that renders the organizer overview.

`modules/insights/overview-data.ts` owns the fixture data and exported types for this screen.

`modules/insights/components/organizer-overview.tsx` composes the page sections. Static sections remain server-rendered.

`modules/insights/components/connection-quality-chart.tsx` is the client boundary for shadcn Charts. It receives serializable chart points and composes Recharts primitives through the local shadcn chart component.

`shared/ui/surface.tsx` provides semantic `flat`, `raised`, `floating`, and `inset` surface variants. `shared/ui/tactile-button.tsx` provides the press behavior shared by filters and compact actions.

Small local SVG icon components are acceptable for this first screen because Morphicons is not installed and adding an icon dependency is outside the requested scope. Icons must share a consistent 1.7 to 1.9 pixel stroke and use `currentColor`.

## Chart Treatment

Use shadcn Charts with Recharts 3 for the connection-quality time series and repeat-attendance radial chart. Keep the reusable shadcn chart primitives in `shared/ui/chart.tsx` and the domain-specific chart composition in the insights module.

The chart uses:

- a single Weft orange series,
- a restrained translucent orange area fill,
- neutral low-contrast grid lines,
- compact graphite axis labels,
- circular markers with a light ceramic rim,
- an inset chart well,
- a small floating value tooltip,
- responsive chart heights for desktop and mobile,
- animation disabled when reduced motion is requested.

The repeat-attendance ring uses Recharts `RadialBarChart` inside the same shadcn `ChartContainer` so both charts share responsive and tooltip behavior.

## Interaction

Time and city filters expose compact menus with semantic buttons, keyboard access, visible focus, and a pressed state that reduces outer elevation and adds a shallow inset shadow. The selected metric receives a soft orange surface treatment.

Rows, navigation items, event cards, and arrow controls provide quiet hover feedback. Pressed controls translate downward by at most one pixel and scale no lower than `0.985`.

All motion respects `prefers-reduced-motion`. Routine interactions remain immediate and do not use decorative entrance animation.

## Responsive Behavior

The desktop composition targets the proportions of the supplied 1024 by 1536 reference while expanding cleanly on wider screens.

- At large widths, the sidebar is fixed within the page grid and analytical sections use asymmetric columns.
- At medium widths, the sidebar narrows and lower analytical regions stack when needed.
- Below tablet width, navigation becomes horizontal, the hero map simplifies, tables gain horizontal overflow, and event cards form a vertical list.
- Touch targets remain at least 44 pixels and text remains readable without zooming.

## Accessibility

Use semantic landmarks, headings, lists, buttons, and tables. Decorative images and SVG paths are hidden from assistive technology. Charts include a concise textual summary. Focus rings remain visible on every interactive element. Color is never the only indication of selection or trend.

## Verification

The implementation is complete when:

- the page matches the reference hierarchy at desktop size,
- surfaces read as diffuse matte ceramic rather than bright directional neumorphism,
- shadcn Charts render without hydration or server-side errors,
- all controls are keyboard reachable and expose visible focus,
- the page remains coherent at desktop, tablet, and mobile widths,
- lint, TypeScript checking, tests, and production build pass,
- a browser screenshot review confirms material depth, spacing, overflow, and responsive behavior.
