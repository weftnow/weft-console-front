# Change specifications

Write a spec when observable behavior, permissions, scope, compatibility, or acceptance needs a decision before implementation. Straightforward fixes can link directly to an [execution plan](../PLANS.md).

Use `docs/changes/YYYY-MM-DD-short-name.md` with: Status, linked plan, problem, explicit requirements, proposals/open decisions, affected roles/organizations, observable behavior, compatibility/non-goals, and acceptance scenarios. Keep Status Draft until consequential decisions are resolved; then Ready. Mark Complete and repair the plan link only after verified acceptance.

## Current specifications

- [F01–F03 UI repair plan](../exec-plans/active/2026-10-18-f01-f03-ui-repair.md): follow-up repairs to event administration, attendee dialogs, product copy and account navigation after a signed-in UI audit.

- [F01 Console access and shared data rules](2026-10-17-f01-console-access-shared-rules.md): implemented foundation with development database integration passed and signed-in browser acceptance pending.
- [F02 Event settings and Wefter management](2026-10-18-f02-event-settings-wefter-management.md): agreed specification; implementation in progress, with database and signed-in browser acceptance pending.
- [F03 Attendee records and contact corrections](2026-10-18-f03-attendee-records-contact-corrections.md): complete; development database, signed-in browser, aggregate verification, and build acceptance passed.

## Imported specifications

The following existing design specifications were migrated from the previous planning tree. Their original status and assumptions are retained as historical evidence; inspect current canonical docs and implementation before using them. None was newly approved or verified by the harness migration.

- [Organizer overview](2026-09-16-organizer-overview-design.md)
- [Network and source architecture](2026-09-17-network-page-src-architecture-design.md)
- [Event detail overview](2026-09-17-event-detail-overview-design.md)
- [Console authentication](2026-10-02-console-authentication-design.md)
- [Production empty states](2026-10-03-production-empty-states-design.md)
- [Invitation onboarding](2026-10-04-invitation-onboarding-design.md)
- [Customer and initial Owner provisioning](2026-10-04-customer-owner-provisioning-design.md)

Related implementation history lives in [legacy plans](../exec-plans/legacy/README.md). Current operational contracts are in the [backend references](../README.md).
