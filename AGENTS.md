<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

Weft is a networking platform for business events.

This repository contains the **Weft Console**, the B2B application for business events.

It is used by event organizers, Weft staff, and sponsors to operate events, coordinate introductions, understand networking outcomes, and access role specific insights.

The attendee facing Weft experience is not part of this application.

For product context:

`docs/product.md`

For architecture:

`ARCHITECTURE.md`

For domain concepts:

`docs/domain.md`

For design implementation:

`docs/design.md`

For engineering conventions:

`docs/engineering.md`

For architectural decisions:

`docs/adr/`

For active feature specifications:

`specs/`

## Development

Install:

```bash
pnpm install
```

Run:

```bash
pnpm dev
```

Tests:

```bash
pnpm test
```

Lint:

```bash
pnpm lint
```

Typecheck:

```bash
pnpm typecheck
```

## Engineering Principles

- Follow existing patterns before introducing new ones.
- Prefer simple, explicit implementations over unnecessary abstractions.
- Keep business logic separate from presentation logic.
- Keep authorization and role permissions explicit.
- Reuse shared logic when appropriate without forcing organizer, staff, and sponsor workflows into the same interface.
- Do not introduce dependencies without clear justification.

## Before Implementing

1. Read the relevant specification.
2. Inspect existing implementations of similar behavior.
3. Read only the product, domain, architecture, and ADR documentation relevant to the task.
4. Identify affected roles and permissions.
5. Produce a plan for nontrivial changes.

## Before Completion

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Verify affected user flows and permissions.
