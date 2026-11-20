# Console domain ownership

This map summarizes existing [product intent](product.md) and [implemented architecture](../ARCHITECTURE.md). It does not grant new permissions or define unimplemented workflows.

| Capability | Current ownership | Delivery boundary |
| --- | --- | --- |
| Events | `src/modules/events/` | Creation, detail, schedule validation, covers, event list, versioned staff grants, persisted networking settings, named Wefters and administrator-managed availability |
| Attendees | Event CSV and attendee-record code in `src/modules/events/`, plus `src/modules/attendees/` | Event guest/import records and event-local canonical identities belong to Events; authorized Owners/Organizers correct details and review exact-contact duplicates. `src/modules/attendees/` owns networking participation and versioned profiles; the global People screen remains an empty state |
| Organizations | `src/modules/organizations/` | Local memberships, Console access, Team invitations, initial customer/Owner provisioning |
| Network | `src/modules/network/` | Screen boundary; relationship exploration and introductions remain product direction |
| Insights | `src/modules/insights/` | Event tracking, organizer-confirmed meetings, Overview aggregates, and seven organizer reports with revisioned event evidence |
| Sponsors | `src/modules/sponsors/` | Partner Report screen boundary. The organizer's sponsor scorecard belongs to Insights. Sponsor-facing report access is future work. |
| Staff | Event access and Wefter management in `src/modules/events/`; no dedicated module | Local staff admission, event grants, Wefter selection and Owner/Organizer-managed availability. Wefters see only their own hours; assignment workflows remain F12. |

Locale is a per-user preference (`users.locale`) that any signed-in user changes for themselves only; it grants no access. An event's language (`events.language`) is event configuration changed under the same Owner/Organizer rule as other event edits. See the [translations specification](changes/2026-10-25-console-translations.md).

An organization is the local tenant. Local users retain UUID identities mapped to a verified Clerk subject and configured instance. A membership connects a user to an organization with a local role and active status. Events belong to an organization; attendees and import batches belong to their event. Clerk organization mappings support provider admission, while local records determine application authority.

Local roles include Owner, Organizer, staff, and sponsor. Owners and Organizers retain organization-wide event access; both manage event grants, while Team invitations remain Owner-only. Staff receive no access from membership or event staffing alone: an active `operator` or `wefter` grant on an event is required. Operators may read granted event details and rosters; Wefters receive an allowlisted context without the roster. Sponsors remain denied operational event access. Multiple eligible organizations require explicit selection. See [shared access contracts](access-contracts.md) and verify each operation at its owning service boundary.

Initial customer provisioning creates a local-first organization, pending Owner grant, and invitation history before provider delivery. Acceptance consumes verified evidence transactionally; an external invitation or membership alone cannot assign local Owner authority. Existing-customer Team invitations use their separate owner-gated workflow. See [customer provisioning](backend/customer-provisioning.md), [Team onboarding](backend/invitation-onboarding.md), and [authentication](backend/authentication.md).

A match records one automatically selected pair in an event (F08). A reportable completion records an Owner or Organizer's confirmation that the two people actually met through that introduction. The pair and the confirmation have separate lifecycles. A later revocation of the match preserves its recorded completion, and a correction removes the completion from the report. A person count uses canonical identities within each event. See [Outcomes reporting](backend/outcomes.md).
