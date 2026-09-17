# ARCHITECTURE.md

## Architecture Style

The Weft Console follows **Screaming Architecture**.

The codebase is organized around the business capabilities of the Console rather than technical layers or framework concepts.

This application is specifically for organizers, Weft staff, and sponsors. It operates, manages, and reports on the networking experience, but it does **not** implement the attendee facing networking or matching experience.

Detailed definitions and ownership of each business capability belong in:

`docs/domain.md`

## Core Principles

- Organize code by business capability.
- Keep Next.js routing and framework integration thin.
- Keep module specific code inside the module that owns it.
- Keep React specific behavior separate from framework independent operations.
- Keep authorization explicit and enforce it beyond the UI.
- Share code only when it is genuinely shared across capabilities.
- Prefer simple structures and add abstraction only when needed.
- Avoid generic top level folders that hide product intent.

## High Level Structure

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

The modules above represent Console business capabilities.

They should evolve as the product domain becomes clearer. Do not create a new module for every page.

## `src/app/`

Contains Next.js routing and framework integration.

Examples:

- pages
- layouts
- route handlers
- loading and error boundaries
- route specific composition

Keep this layer thin.

Pages and route handlers should mainly receive framework input, invoke behavior owned by modules, and render or return the result.

Business logic should not live directly in route files.

## `src/modules/`

Contains the business capabilities of the Console.

A module should start simple and only contain folders it actually needs.

Typical structure:

```text
src/modules/
└── network/
    ├── components/
    ├── hooks/
    ├── queries/
    ├── mutations/
    └── types.ts
```

None of these folders are mandatory.

### `components/`

Contains UI that belongs specifically to the module.

Examples:

```text
connection-recommendation-card.tsx
network-explorer.tsx
introduction-status-badge.tsx
```

If a component only makes sense within one business capability, keep it inside that module.

Generic reusable UI belongs in `src/shared/ui/`.

### `hooks/`

Contains reusable React specific behavior owned by the module.

Examples:

```text
use-network-filters.ts
use-connection-recommendations.ts
use-introduction-status.ts
```

Create a hook only when the behavior actually depends on React hooks or React state.

Do not wrap ordinary functions in hooks unnecessarily.

### `queries/`

Contains operations that read module data.

Examples:

```text
get-network-overview.ts
get-connection-recommendations.ts
get-direct-connections.ts
```

Queries should represent reads regardless of whether they are called directly from a Server Component or wrapped by a client side data fetching hook.

### `mutations/`

Contains operations that create, update, delete, or otherwise change state.

Examples:

```text
plan-introduction.ts
complete-introduction.ts
update-connection-context.ts
```

A mutation represents the operation itself.

React hooks may wrap mutations when client side state, caching, optimistic updates, or loading behavior is needed.

`mutations/` does not imply a specific library or Next.js Server Actions.

### `types.ts`

Contains types owned by the module and shared by multiple files inside it.

Keep types close to their owning capability instead of creating a global type collection by default.

### Optional folders

Add additional folders only when a real need appears.

For example:

```text
schemas/
```

may be useful when a module has several validation schemas.

Do not create folders such as `domain/`, `application/`, or `data/` by default. Introduce deeper architecture only when actual complexity justifies it.

## Data Flow

A common client side flow may look like:

```text
Component
    ↓
Hook
    ↓
Query / Mutation
    ↓
API or data source
```

But this is not mandatory.

With Next.js Server Components, a component may call a query directly:

```text
Server Component
    ↓
Query
    ↓
Data source
```

Do not introduce a hook or abstraction layer purely for structural symmetry.

## Module Boundaries

Code should depend on the module that owns the business capability.

Avoid reaching into unrelated modules for internal implementation details.

When one capability needs another, use a clear and intentional dependency.

Public barrel files such as `index.ts` are optional.

If used, do not mix client only and server only exports through the same barrel. Prefer explicit imports when they make runtime boundaries clearer.

## `src/shared/`

Contains code genuinely reusable across unrelated modules.

Typical structure:

```text
src/shared/
├── ui/
├── hooks/
├── lib/
└── types/
```

Examples:

- generic design system components
- truly cross module React hooks
- formatting utilities
- generic helpers
- application wide types

Do not move code into `src/shared/` merely because it is used twice.

Prefer module ownership until the abstraction is clearly cross cutting.

## `src/infrastructure/`

Contains technical capabilities that are not owned by one Console business module.

Examples may include:

```text
src/infrastructure/
├── database/
├── auth/
├── analytics/
└── external-services/
```

Infrastructure contains integrations and technical implementations, not Console business rules.

If an integration belongs exclusively to one module, keeping it inside that module may be clearer.

## Roles and Authorization

The Console serves:

- organizers
- Weft staff / Wefters
- sponsors and partners

The same business capability may be exposed differently depending on the role.

Authorization must be enforced where protected behavior or data access occurs, not only through hidden components or routes.

## Naming

Prefer business language at the architectural level.

Good:

```text
events
attendees
network
sponsors
staff
insights
organizations
```

The Network capability owns relationship exploration, connection recommendations, and introduction planning or status. An introduction is a domain operation and outcome within Network rather than a separate top-level capability.

Avoid organizing the application primarily around technical names such as:

```text
controllers
services
helpers
managers
```

Technical names may exist inside a module when they describe a real implementation responsibility, but they should not define the top level architecture.

## Adding a Feature

Before implementing a feature:

1. identify which Console capability owns it,
2. place the implementation in that module,
3. keep route code thin,
4. use `components`, `hooks`, `queries`, and `mutations` only where needed,
5. create a new module only when a new business capability genuinely exists.

For detailed module responsibilities and boundaries, read:

`docs/domain.md`

## Architectural Decisions

Important architectural decisions belong in:

`docs/adr/`

`ARCHITECTURE.md` defines the structure and architectural rules of the codebase.

`docs/domain.md` defines the meaning and ownership of the Console business capabilities.

ADRs explain why significant architectural decisions were made.

## Evolution

The architecture should evolve with the product.

Change module boundaries or introduce additional structure when actual complexity requires it.

Screaming Architecture should make the Console easier to understand, not create ceremony for its own sake.
