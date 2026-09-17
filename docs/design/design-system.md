# Weft Design System

## Purpose

This document defines the implementation rules for Weft's visual system.

It focuses only on design related concerns:

* reusable UI primitives
* visual tokens
* surface depth
* typography
* spacing
* color
* motion
* icons
* interaction states
* accessibility as it affects UI behavior

For broader project structure and architectural rules, use `architecture.md`.

Use this document together with `design.md`.

---

## 1. Design stack

Weft uses:

* **shadcn/ui** for accessible UI primitives
* **Tailwind CSS** for styling and design tokens
* **Motion for React** for tactile interaction and visual continuity
* **Morphicons** for interface icons and meaningful icon transitions

Core principle:

> shadcn provides behavior. Weft provides appearance. Motion provides physicality. Morphicons provides icon continuity.

Do not introduce another general purpose UI library just to match a visual style.

---

## 2. Where design components live

The design system must respect the project architecture without defining it.

Reusable visual primitives belong in:

```text
shared/ui/
```

Examples:

```text
shared/ui/button.tsx
shared/ui/card.tsx
shared/ui/surface.tsx
shared/ui/tactile-button.tsx
shared/ui/icon-button.tsx
shared/ui/weft-icon.tsx
shared/ui/stat.tsx
shared/ui/filter-control.tsx
```

Components that visually compose a specific product feature stay inside that feature.

Example:

```text
features/events/components/event-performance-table.tsx
features/network/components/network-snapshot.tsx
```

A component belongs in `shared/ui` only when it is visually reusable and has no dependency on a specific Weft domain.

Do not create a parallel `components/system` or `components/features` hierarchy for the design system.

---

## 3. shadcn usage

Use shadcn components as the behavioral foundation.

Examples:

```text
Button
Dialog
Dropdown Menu
Input
Select
Sheet
Table
Tabs
Tooltip
```

Do not treat shadcn's default appearance as the final Weft design.

Instead:

1. keep its accessibility and interaction behavior
2. apply Weft tokens
3. compose higher level reusable visual primitives when needed

If a shadcn primitive already solves the behavior, do not recreate it from raw `div` elements.

---

## 4. Design tokens

Repeated visual values must be centralized.

Do not scatter arbitrary:

* colors
* shadows
* radii
* spacing
* animation durations
* spring values

through feature code.

Suggested starting tokens:

```css
:root {
  --weft-canvas: oklch(0.975 0.006 75);

  --weft-surface: oklch(0.985 0.004 75);
  --weft-surface-soft: oklch(0.965 0.006 75);
  --weft-surface-inset: oklch(0.955 0.007 75);

  --weft-text: oklch(0.18 0.01 60);
  --weft-text-muted: oklch(0.48 0.01 60);

  --weft-border: oklch(0.88 0.008 70 / 0.7);

  --weft-orange: oklch(0.68 0.19 45);
  --weft-orange-soft: oklch(0.94 0.045 55);

  --weft-radius-sm: 10px;
  --weft-radius-md: 14px;
  --weft-radius-lg: 18px;
  --weft-radius-xl: 24px;

  --weft-shadow-raised:
    -8px -8px 20px rgb(255 255 255 / 0.72),
    8px 10px 24px rgb(55 45 35 / 0.09),
    0 1px 2px rgb(55 45 35 / 0.05);

  --weft-shadow-floating:
    -5px -5px 12px rgb(255 255 255 / 0.78),
    6px 8px 16px rgb(55 45 35 / 0.13),
    0 1px 2px rgb(55 45 35 / 0.08);

  --weft-shadow-inset:
    inset 3px 3px 8px rgb(55 45 35 / 0.07),
    inset -3px -3px 8px rgb(255 255 255 / 0.72);

  --weft-shadow-pressed:
    inset 2px 2px 5px rgb(55 45 35 / 0.10),
    inset -2px -2px 5px rgb(255 255 255 / 0.58);
}
```

These values are a starting point.

If the product needs visual tuning, change the token centrally instead of creating local variants.

---

## 5. Surface system

Depth is semantic.

Every substantial visual region should map to one of these roles.

### Canvas

```text
Purpose: page background
Depth: 0
Interaction: none
```

### Raised

```text
Purpose: cards, sidebar, major panels
Depth: 1
Interaction: usually none
```

### Floating

```text
Purpose: buttons, filters, selectors, icon controls
Depth: 2
Interaction: yes
```

### Inset

```text
Purpose: inputs, chart wells, progress tracks, selected wells
Depth: -1
Interaction: content dependent
```

### Accent

```text
Purpose: selection or primary emphasis
Color: restrained orange treatment
Depth: depends on the underlying component
```

Prefer a reusable `Surface` primitive for these roles rather than repeating shadows manually.

---

## 6. Depth hierarchy

Do not make every element raised.

Preferred composition:

```text
canvas
  → raised panel
    → flat content
    → inset chart
    → floating control
```

Avoid:

```text
raised page
  → raised panel
    → raised card
      → raised button
        → raised icon
```

The premium effect comes from contrast between levels of depth.

Too many elevated elements make the UI look inflated.

---

## 7. Light direction

All dimensional elements must appear to share the same light source.

Default direction:

```text
upper left → lower right
```

That means:

* upper left edges receive subtle highlights
* lower right edges receive soft shadows
* inset elements visually reverse the depth
* neighboring components must not use conflicting shadow directions

Do not create arbitrary shadow directions in individual components.

---

## 8. Buttons

Start from shadcn `Button`.

Weft variants may include:

```text
primary
secondary
ghost
tactile
danger
```

### Tactile behavior

Rest:

* floating surface
* quiet outer shadow
* subtle inner highlight
* graphite text
* orange only when semantically important

Hover:

* tiny lift or highlight increase
* scale should rarely exceed `1.01`

Press:

* scale around `0.98` to `0.99`
* optional 1 px downward movement
* reduced outer shadow
* optional pressed inset shadow

The interaction should feel physical without looking animated.

Example:

```tsx
import { motion } from "motion/react"

<motion.div
  whileHover={{ y: -1 }}
  whileTap={{ y: 1, scale: 0.985 }}
  transition={{ type: "spring", stiffness: 500, damping: 32 }}
>
  <Button variant="secondary">
    Open event
  </Button>
</motion.div>
```

Keep the actual button semantics and keyboard behavior intact.

---

## 9. Cards and panels

Cards should be classified by purpose.

### Section card

Large container for a meaningful page region.

Usually:

```text
raised
```

### Metric card

Compact and scannable.

Its hierarchy should come primarily from:

1. metric value
2. label
3. supporting trend
4. icon
5. surface treatment

### Interactive card

May receive a tiny hover lift.

### Selected card

Prefer:

* orange border
* soft orange tint
* subtle selected surface treatment

Do not make selection dramatically more elevated.

### Nested content

Inside a raised card, prefer:

* flat regions
* inset wells
* subtle dividers

Avoid stacking multiple strong raised cards.

---

## 10. Inputs and selectors

Use shadcn form primitives.

Inputs should generally feel slightly inset.

Default behavior:

```text
rest → inset surface
focus → visible ring or border
invalid → semantic error treatment
disabled → reduced contrast, no tactile response
```

Filters and compact selectors may use the floating surface style.

Do not use orange as the only focus indicator.

---

## 11. Sidebar and navigation states

The sidebar itself may be a raised surface.

Navigation items should follow:

```text
inactive → mostly flat
hover → subtle tactile response
active → soft selected or inset treatment
```

The active state may use:

* orange icon
* orange text
* soft orange tint
* subtle inset depth

The active item should feel selected, not simply colored.

---

## 12. Color usage

The interface should remain predominantly neutral.

Primary palette:

* warm white canvas
* warm neutral surfaces
* graphite text
* muted graphite secondary text
* subtle warm borders
* Weft orange accent

Orange is reserved for:

* primary actions
* active navigation
* selected states
* important metrics
* chart emphasis
* connection related emphasis
* small status indicators

Do not use orange merely to make an element more visually interesting.

Use semantic classes instead of raw palette classes inside feature components.

Prefer:

```text
bg-background
bg-card
text-foreground
text-muted-foreground
border-border
text-weft-accent
bg-weft-accent-soft
```

Avoid:

```text
bg-orange-500
text-stone-700
border-gray-200
```

---

## 13. Typography

Use the project brand font when configured.

Otherwise:

```css
--font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
```

Suggested hierarchy:

```text
Page title
32 to 44 px
600 to 700

Section title
18 to 22 px
600

Metric
30 to 42 px
650 to 700

Body
14 to 16 px
400 to 500

Label
12 to 14 px
500 to 600

Micro label
11 to 12 px
500
optional uppercase tracking
```

Use tabular numerals when metric alignment matters.

The interface should still feel premium if shadows are temporarily removed.

If it does not, improve typography and spacing before increasing visual effects.

---

## 14. Spacing

Use the Tailwind spacing scale unless a semantic token exists.

Preferred rhythm:

```text
4 px    micro gap
8 px    compact internal gap
12 px   control gap
16 px   standard internal spacing
24 px   card padding
32 px   section spacing
48 px   major separation
```

Avoid arbitrary values used only to patch visual inconsistencies.

---

## 15. Radius

Use a limited radius scale.

```text
10 px   compact controls
14 px   buttons and small cards
18 px   standard cards
24 px   major panels
999 px  intentional pills and circles only
```

Nested surfaces should generally use a smaller radius than their parent.

Do not make every control pill shaped.

---

## 16. Shadows

Primary shadows must come from shared tokens.

Use semantic classes such as:

```text
shadow-weft-raised
shadow-weft-floating
shadow-weft-inset
shadow-weft-pressed
```

Feature specific components should not define new multi layer shadows unless the design system itself is being intentionally extended.

If the product needs stronger or softer depth, update the shared token.

---

## 17. Morphicons

Use Morphicons for Weft interface icons.

Recommended setup:

```bash
pnpm add morphicons lucide
```

Morphicons consumes icon data.

Correct:

```tsx
import { MorphIcon } from "morphicons/react"
import { Menu, X } from "lucide"
```

Create a shared wrapper in:

```text
shared/ui/weft-icon.tsx
```

The wrapper should define:

* default size
* stroke width
* reduced motion behavior
* accessibility behavior
* common class names

Example:

```tsx
import { MorphIcon } from "morphicons/react"
import type { IconNode } from "lucide"

type WeftIconProps = {
  icon: IconNode
  label?: string
  size?: number
  className?: string
}

export function WeftIcon({
  icon,
  label,
  size = 18,
  className,
}: WeftIconProps) {
  return (
    <MorphIcon
      icon={icon}
      label={label}
      size={size}
      strokeWidth={1.75}
      reducedMotion="user"
      className={className}
    />
  )
}
```

---

## 18. Icon morphing rules

Morph icons only when the same control changes state.

Good:

```text
menu → close
plus → check
chevron down → chevron up
play → pause
volume → volume off
expand → collapse
```

Bad:

```text
calendar → person
search → settings
home → star
```

Morphing must communicate continuity or state.

Do not animate unrelated navigation icons simply because Morphicons supports it.

---

## 19. Motion

Import Motion from:

```tsx
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from "motion/react"
```

Use Motion for:

* tactile press feedback
* hover elevation
* expand and collapse
* selection transitions
* shared layout changes
* drawers and dialogs
* reordering
* meaningful enter and exit transitions

Use CSS transitions for:

* simple color changes
* borders
* small opacity changes
* straightforward shadow changes

Do not use Motion merely because it is installed.

---

## 20. Motion tokens

Use a small shared vocabulary.

Suggested defaults:

```ts
export const motionTokens = {
  fast: {
    duration: 0.12,
  },

  standard: {
    duration: 0.2,
    ease: [0.2, 0.8, 0.2, 1],
  },

  spring: {
    type: "spring",
    stiffness: 500,
    damping: 32,
  },

  softSpring: {
    type: "spring",
    stiffness: 320,
    damping: 30,
  },
} as const
```

Do not invent new spring values in feature components without a concrete reason.

---

## 21. Motion hierarchy

### Micro interaction

Examples:

* button press
* icon state change
* hover lift

Typical duration:

```text
immediate to about 160 ms
```

### Component transition

Examples:

* dropdown
* tooltip
* accordion
* card expansion
* filter change

Typical duration:

```text
about 160 to 240 ms
```

### Structural transition

Examples:

* sidebar collapse
* shared layout movement
* modal or sheet transition
* major content replacement

Typical duration:

```text
about 200 to 320 ms
```

Routine dashboard interactions should never feel slow.

---

## 22. Reduced motion

Reduced motion support is mandatory.

For Motion:

* use `useReducedMotion()` when meaningful spatial movement is involved
* fall back to opacity or instant state changes where appropriate

For Morphicons:

```tsx
<MorphIcon reducedMotion="user" ... />
```

Do not disable reduced motion support to preserve an effect.

---

## 23. Focus states

Do not remove focus indicators.

Preferred treatment:

* thin high contrast ring
* small ring offset
* visible against warm neutral surfaces
* compatible with raised and inset states

Keyboard focus must remain visible after wrapping shadcn components with Motion.

---

## 24. Charts

Charts must follow the Weft visual language regardless of the chart library.

Rules:

* primary series uses Weft orange
* secondary series use graphite neutrals unless categorical distinction is required
* grid lines remain subtle
* axis labels remain low contrast
* chart wells may use inset surfaces
* tooltips may use floating surfaces
* avoid rainbow palettes
* avoid strong area gradients
* respect reduced motion

Data hierarchy should come from typography and contrast before decoration.

---

## 25. Tables and lists

Tables should feel integrated with the surrounding surface.

Use:

* soft row separators
* comfortable row height
* clear first column hierarchy
* tabular numerals where useful
* quiet row hover
* compact controls

Avoid:

* boxed cells
* heavy grid lines
* turning every row into a floating card on desktop

A table may live inside a flatter or inset region within a raised panel.

---

## 26. Dialogs, sheets, menus, and popovers

Use shadcn primitives for behavior.

Apply Weft surfaces to their content.

Typical depth relationship:

```text
page canvas
  → raised content
    → floating menu, popover, or dialog
```

Keep overlays subtle.

Avoid:

* excessive backdrop blur
* glowing containers
* dramatic scale animation

Placement and motion should create continuity with the trigger.

---

## 27. Loading and state changes

Prefer stable layouts.

Use:

* skeletons that preserve final dimensions
* small opacity transitions
* layout animation when content reorders
* Morphicons for stateful icon changes
* restrained number transitions for meaningful metric updates

Avoid:

* full screen loaders for local actions
* constant shimmer across large dashboards
* decorative loading animation
* spinners for actions that resolve almost immediately

---

## 28. Responsive behavior

The tactile language must simplify gracefully.

On smaller screens:

* reduce depth before reducing clarity
* simplify nested surfaces
* preserve touch targets
* avoid miniature desktop cards
* stack meaningful groups vertically
* keep primary actions reachable
* reduce unnecessary motion

Do not preserve desktop visual complexity at the cost of usability.

---

## 29. Reusable design component rule

Before creating a new shared visual component, ask:

```text
Is the pattern visually reusable?
Is it independent from a specific Weft domain?
Does it appear in more than one feature?
Does it encode a design system rule rather than business logic?
```

If yes, it may belong in:

```text
shared/ui/
```

If the component contains event, network, sponsor, attendee, organizer, or other domain meaning, keep it inside that feature even if it uses shared visual primitives.

---

## 30. Agent design rules

When implementing Weft UI:

1. Start from hierarchy, spacing, and typography before adding depth.
2. Use shadcn for existing interaction primitives.
3. Reuse `shared/ui` design primitives before creating a new visual primitive.
4. Keep feature specific visual compositions inside their feature.
5. Use the defined surface roles instead of arbitrary shadows.
6. Do not make every card raised.
7. Use orange intentionally and sparingly.
8. Use Motion only when it improves tactility, continuity, or state understanding.
9. Use Morphicons for interface icons and meaningful icon state transitions.
10. Keep all motion restrained.
11. Preserve keyboard focus and reduced motion.
12. Do not add another UI library for a single visual effect.
13. Do not introduce one off shadows, radii, spacing scales, or motion values when existing tokens solve the problem.
14. If uncertain between two visual treatments, choose the quieter one.

---

## 31. Visual review checklist

Before considering a UI implementation finished:

* Is the hierarchy obvious immediately?
* Does typography carry most of the visual weight?
* Is orange used intentionally?
* Are raised, flat, floating, and inset surfaces used meaningfully?
* Do all shadows appear to share the same light source?
* Are nested surfaces restrained?
* Do controls feel tactile without exaggerated movement?
* Does every animation communicate something?
* Are Morphicons transitions meaningful rather than decorative?
* Are focus states visible?
* Does reduced motion work?
* Does the screen still look strong with shadows reduced?
* Does the screen still look coherent with motion disabled?
* Does the result feel like Weft rather than a generic SaaS dashboard?

If several answers are no, simplify before adding more visual effects.
