# Outcomes intelligence reports

Status: Active

Owner: current agent

Created: 2026-11-24

## Goal and acceptance

- [ ] Owners and Organizers can open the seven reports via Outcomes and open an event-scoped report from Event Detail. Filters and report selections are addressable.
- [ ] Reports distinguish confirmed meetings, structured organizer-entered evidence, missing data, and measured zeros. Synthetic cases cover denominators, incomplete check-ins, repeat identities, and sponsor and tenant boundaries.
- [ ] Organizers can load and correct structured event evidence, with scoped references and conflict detection. Existing event matching, meeting recording, and simulation behavior remain available.
- [ ] Review and verify the combined implementation and merge into `feat/matching-simulation`.

## Context and work streams

[Outcomes design](../../changes/2026-11-24-outcomes-reporting-design.md) defines the report views. The target branch already has [meeting confirmation](../../backend/outcomes.md). Reuse those confirmations and keep new reporting files separate from unpublished chart and simulation edits in the target checkout.

- [ ] Codex implements scoped evidence persistence, migration and read sources.
- [ ] Codex implements pure report calculations and scenario tests.
- [ ] Antigravity implements localized report views and visual drill-downs.
- [ ] Parent integrates routes, navigation, evidence editing and verification.

## Decisions

- Organizer-reviewed structured event evidence is the initial capture mechanism. It uses roster person IDs and saved match IDs and can be corrected by a revisioned replacement. Attendee check-ins can be collected externally and recorded here.
- Cross-event identity uses explicit organizer-assigned keys within one organization. An organization-wide key links only the people explicitly assigned that key.
- Keep the existing `/outcomes` recorded-meeting summary reachable. The sidebar and Event Insights lead to the seven new reports.

## Verification

Run repository checks, isolated migration and boundary tests, and signed-in acceptance as described in [Verification](../../VERIFICATION.md). Record actual results here before handoff.
