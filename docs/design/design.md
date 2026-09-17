# Weft Design Direction

## Purpose

This document defines the visual and interaction direction for Weft interfaces.

It is intentionally about **how the product should feel**, not about implementation details. For exact tokens, component rules, and code conventions, use `design-system.md`.

The target is a **premium tactile interface**: calm, warm, physical, precise, and modern.

We are not building a generic neumorphic UI. We use dimensionality selectively to create hierarchy and tactility.

---

## 1. Design character

Weft should feel:

* Premium, not flashy
* Tactile, not toy like
* Dimensional, not inflated
* Warm, not sterile
* Minimal, not empty
* Refined, not decorative
* Calm, not motion heavy
* Physical enough to feel intentional, but still unmistakably software

The interface should resemble a carefully designed physical control surface made from warm ceramic, matte polymer, and soft light.

### Keywords

`warm` · `tactile` · `soft dimensional` · `ceramic` · `graphite` · `precise` · `quiet luxury` · `editorial` · `premium`

### Avoid

`glassmorphism` · `heavy gradients` · `neon` · `gaming UI` · `cyberpunk` · `cartoonish clay` · `strong neumorphism everywhere` · `over animated dashboards`

---

## 2. Core visual principle

### Depth communicates hierarchy

Depth is functional. It must tell the user what is interactive, selected, grouped, or structurally important.

Use four primary surface levels:

1. **Canvas**
   The warm off white page background. Quiet and nearly flat.

2. **Raised surface**
   Cards, panels, sidebar containers, and important content regions. Slightly lifted from the canvas.

3. **Floating control**
   Buttons, selectors, icon controls, filters, and compact actions. More tactile than cards and clearly pressable.

4. **Inset surface**
   Inputs, selected wells, chart containers, progress tracks, and areas that visually sit inside another surface.

Not every element should protrude. The contrast between raised and inset surfaces is what makes the tactile system feel intentional.

---

## 3. Visual hierarchy

Hierarchy should come from this order:

1. Typography
2. Spacing
3. Surface depth
4. Contrast
5. Accent color
6. Motion

Do not use orange simply to make something noticeable. Orange is reserved for meaningful emphasis.

Examples:

* Active navigation
* Primary action
* Selected state
* Important metric
* Current chart series
* Connection or network related emphasis
* Small status indicators

Large areas of saturated orange should be rare.

---

## 4. Color direction

The product should be built primarily from warm neutrals.

### Base palette

* Canvas: warm white, not pure white
* Surfaces: slightly brighter or slightly darker warm neutrals
* Primary text: near black graphite
* Secondary text: soft graphite gray
* Borders: extremely subtle warm gray
* Shadows: neutral to slightly warm, never blue
* Accent: Weft orange

Pure `#FFFFFF` and pure `#000000` should be used sparingly.

The page should remain predominantly neutral. Orange should feel valuable because it is scarce.

---

## 5. Material and light

All dimensional elements must appear to share the same light source.

Default light direction:

**upper left**

This means:

* Highlights appear toward the upper left edge
* Darker shadows fall toward the lower right
* Inset elements reverse the perceived depth
* Adjacent components must not use conflicting shadow directions

The goal is not to simulate reality perfectly. The goal is to make the interface feel materially consistent.

### Surface quality

Prefer:

* Soft diffuse shadows
* Very subtle inner highlights
* Fine low contrast borders
* Matte or ceramic appearance
* Low saturation ambient shading

Avoid:

* Hard drop shadows
* Thick borders
* glossy gradients
* excessive blur
* multiple visible light sources
* exaggerated embossing

---

## 6. Shape language

Use a generous but disciplined rounding.

General rules:

* Large panels: medium to large radius
* Cards: medium radius
* Buttons and compact controls: pill or soft rounded rectangle when appropriate
* Icon buttons: circles or compact rounded squares
* Inputs: rounded, but not oversized
* Nested elements should usually have a smaller radius than their parent

Do not make every object a pill.

Rounded corners should support the physical material language, not become the visual identity by themselves.

---

## 7. Layout

Weft dashboard layouts should feel spacious and editorial.

### Principles

* Use a clear grid
* Align card edges rigorously
* Keep consistent gutters
* Give data room to breathe
* Prefer a few strong regions over many tiny widgets
* Use asymmetric composition only when it improves hierarchy
* Keep primary navigation visually separate from content
* Important numbers should be immediately scannable

Dense information is acceptable. Visual noise is not.

### Dashboard composition

A typical page should follow this rhythm:

1. Page context or global controls
2. Strong overview or hero region
3. Primary metrics
4. Main analytical content
5. Secondary operational content
6. Lower priority details

Do not start a dashboard with a wall of equally weighted cards.

---

## 8. Cards and panels

Cards should look like objects resting gently on the canvas.

A card should not automatically receive the strongest shadow available.

Use stronger depth only when the element is:

* Floating
* Interactive
* Selected
* Temporarily elevated
* Overlapping another surface

Cards inside cards should usually become flatter or inset instead of creating another raised layer.

This is important. Too many raised surfaces make the interface look inflated.

---

## 9. Buttons and controls

Buttons should feel physically pressable.

The default interaction model:

**rest → hover lift or highlight → press inward → release**

The motion should be subtle enough that users feel it more than notice it.

Primary controls may use orange, but the premium effect should come from material, depth, proportion, and motion rather than saturation.

Secondary buttons should usually remain neutral.

### Pressed state

A pressed control should feel slightly closer to or inside the parent surface.

Use some combination of:

* Very small scale reduction
* Reduced outer shadow
* Subtle inset shadow
* Tiny downward translation
* Slight contrast shift

Never use all of these aggressively at once.

---

## 10. Navigation

Navigation should behave like a physical control panel.

For sidebars:

* The sidebar container is a raised surface
* Inactive items are mostly flat
* Hover creates a slight tactile response
* Active items use a soft inset or selected surface
* Orange identifies the active destination
* Icons and labels remain visually balanced
* Avoid heavy separators between items

The active state should look selected, not merely colored.

---

## 11. Data visualization

Charts must inherit the same calm visual language.

### Rules

* Use neutral grid lines
* Keep axis labels low contrast
* Use orange for the primary series
* Avoid rainbow data palettes unless categories truly require them
* Tooltips may float above the chart with a tactile surface
* Chart containers may use subtle inset treatment
* Avoid glowing graphs
* Avoid excessive gradients
* Animation should clarify data changes, not decorate them

Metrics should use typography before color.

---

## 12. Tables and lists

Tables should feel integrated with the surrounding surface.

Prefer:

* Soft row separation
* Comfortable row height
* Clear numeric alignment
* Small imagery when useful
* Quiet hover treatment
* Compact controls
* Strong first column hierarchy

Avoid boxed cells and heavy grid lines.

A table may live inside an inset or flatter area within a raised panel.

---

## 13. Typography

Typography carries most of the premium feeling.

Use the project brand typeface if one is configured. Otherwise use **Geist Sans** as the default product typeface.

### Principles

* Headlines: confident and compact
* Body: neutral and highly readable
* Metrics: large, dense, and precise
* Labels: small but not faint
* Uppercase tracking only for small section labels
* Avoid excessive font weight variation
* Avoid decorative typography in operational UI

Large numbers should use tabular numerals when useful.

The interface should still feel premium with every shadow removed. If it does not, improve typography and spacing before adding more depth.

---

## 14. Icons

Weft uses **Morphicons** as the icon rendering and transition layer.

Icons should be:

* Stroke based
* Minimal
* Consistent in optical weight
* Usually 16, 18, 20, or 24 px
* Decorative only when necessary
* Animated only when a state actually changes

Examples of good morphs:

* Menu → close
* Chevron down → chevron up
* Play → pause
* Plus → check
* Expand → collapse
* Bell → bell off

Do not morph unrelated icons just because the library allows it.

Icon animation must communicate state.

---

## 15. Motion philosophy

Motion should make the interface feel physical and continuous.

We use **Motion for React** for component and layout motion.

Motion should communicate:

* Press and release
* Hover response
* Selection
* Expansion and collapse
* Reordering
* Enter and exit
* Shared element continuity
* State transitions

Motion should not:

* Make every card float
* Delay common actions
* Animate large page regions without reason
* Use bouncy springs throughout the dashboard
* Create spectacle during routine work

### Motion character

Most interactions should feel:

* Fast
* Soft
* Controlled
* Slightly spring based
* Interruptible

Prefer subtle spring motion for physical controls and short easing for opacity or color.

---

## 16. Premium does not mean more effects

When an interface does not feel premium, do not automatically add:

* More shadows
* More blur
* More animation
* More gradients
* More rounded corners
* More orange

First check:

* Alignment
* Spacing
* typography
* visual hierarchy
* consistency
* content density
* surface relationships

Premium interfaces are usually restrained.

---

## 17. Responsive behavior

The tactile language must survive smaller screens.

On smaller screens:

* Reduce depth before reducing clarity
* Simplify nested surfaces
* Collapse secondary information
* Preserve generous touch targets
* Do not shrink desktop widgets until they become miniature
* Convert dense grids into meaningful vertical groups
* Keep important actions reachable

Motion and depth should never reduce performance on mobile devices.

---

## 18. Accessibility

Visual polish never overrides accessibility.

Always preserve:

* Visible keyboard focus
* Sufficient text contrast
* Semantic controls
* Correct labels
* Minimum touch targets
* Reduced motion support
* State communication that does not depend only on color

Focus rings should be integrated into the aesthetic instead of removed.

---

## 19. Agent rules

When designing or implementing Weft UI:

1. Start from the information hierarchy, not from a visual effect.
2. Use shadcn/ui primitives before creating a new primitive.
3. Use the depth model defined in this document.
4. Do not make every card or control raised.
5. Prefer one dominant accent color: Weft orange.
6. Use Motion only when it improves continuity, state, or tactility.
7. Use Morphicons for interface icons and meaningful icon transitions.
8. Preserve accessibility behavior from shadcn primitives.
9. Do not add another UI component library without a concrete technical reason.
10. Do not introduce a new shadow, radius, spacing scale, or motion pattern when an existing token can solve the problem.
11. If a custom component is needed, compose it from existing primitives and design tokens.
12. Match the surrounding Weft interface before matching an external inspiration.
13. When uncertain, choose the quieter visual treatment.
14. Treat the supplied dashboard reference as a direction, not as a template to copy literally.

---

## 20. Design review test

Before considering a screen finished, ask:

* Is the hierarchy obvious in three seconds?
* Is orange being used intentionally?
* Can I tell what is interactive without exaggerated effects?
* Are raised and inset surfaces used meaningfully?
* Does every shadow appear to come from the same light source?
* Does motion communicate something?
* Does the UI still look strong with motion disabled?
* Does the UI still look strong with shadows reduced?
* Is the layout calm even when the data is dense?
* Does this feel like Weft rather than a generic SaaS dashboard?

If the answer to several of these is no, simplify before adding more styling.
