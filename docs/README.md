# Documentation index

[AGENTS.md](../AGENTS.md) is the short entry point. This index routes to canonical references; load only the files needed for a change.

| Reference | Ownership and use |
| --- | --- |
| [Product](product.md) | Users, product intent, delivery boundary, and open scope |
| [Architecture](../ARCHITECTURE.md) | Implemented boundaries and separately labeled architecture direction |
| [Domain](domain.md) | Capability ownership, organization context, local roles |
| [Shared access contracts](access-contracts.md) | Event grants, local IDs, revisions, pair normalization, and restricted Wefter context |
| [Design direction](design/design.md) | Visual and interaction intent |
| [Design system](design/design-system.md) | Shared primitives, tokens, accessibility; installed versus proposed tooling |
| [Engineering](engineering.md) | Local runtime, TypeScript, framework, dependency, and generated-output conventions |
| [Plans](PLANS.md) | Plan thresholds, template, progress, and completion policy |
| [Change specifications](changes/README.md) | Behavior decisions and historical specifications |
| [Active plans](exec-plans/active/) | Current work and next steps |
| [Completed plans](exec-plans/completed/) | Accepted work with verification evidence |
| [Legacy plans](exec-plans/legacy/README.md) | Imported history with uncertain completion; reconcile before reuse |
| [Debt tracker](exec-plans/tech-debt-tracker.md) | Concrete nonblocking gaps and next actions |
| [Verification](VERIFICATION.md) | Commands, change matrix, integration prerequisites, evidence limits |
| [Hooks](HOOKS.md) | Prepared Git hooks, activation, failure and recovery behavior |
| [Repository skills](../.agents/skills/README.md) | Reusable maintenance, verification, and commit procedures |

## Backend operations and contracts

- [Event creation](backend/create-event.md): validation, persistence, API and rollout limits.
- [Attendee CSV imports](backend/attendee-imports.md): append-only imports, duplicates, replay, capacity and isolation.
- [Attendee records and contact corrections](backend/attendee-records.md): event-local identities, corrected details, exact-contact review, and revisions.
- [Networking participation](backend/networking-participation.md): inclusion, exclusions and event-local do-not-match pairs.
- [Attendee profiles](backend/attendee-profiles.md): versioned profile details, completeness and organizer-only text.
- [Divergent migration histories](backend/migration-history-reconciliation.md): the F01–F05 merge, applied SQL compatibility and upgrade validation.
- [Authentication](backend/authentication.md): Clerk identity to local user mapping and local authorization.
- [Invitation onboarding](backend/invitation-onboarding.md): existing-customer Team invitations and provider organization bridge.
- [Customer provisioning](backend/customer-provisioning.md): initial organization and Owner grant, explicit operator commands and recovery.
- [Vercel deployment](backend/vercel-deployment.md): build and migration order, environment boundaries, rollback limits.
- [Automatic matches](backend/matches.md): engine feed sync, stored pairs, revocation, Owner/Organizer API.
- [Event settings and Wefter management](backend/event-settings.md): persisted settings, schedules, API contracts, and F12 integration boundary.

## Documentation maintenance

The existing product, architecture, and design paths remain canonical. Maintain them within authorized work when accepted behavior or implemented boundaries change. Record consequential unresolved choices as proposals in a change specification or active plan. No extra owner approval policy is introduced by this harness.

The former tool-specific planning tree has moved into change specifications and legacy execution plans. Existing content is retained as history; its original checkboxes or status lines do not establish current implementation or acceptance. There is no separate root specs or ADR hierarchy.

Run `pnpm check:docs` after changing links, instructions, or document paths. Any assistant can read these Markdown references and procedures manually; automatic discovery depends on its host.
