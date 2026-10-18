# Console domain ownership

This map summarizes existing [product intent](product.md) and [implemented architecture](../ARCHITECTURE.md). It does not grant new permissions or define unimplemented workflows.

| Capability | Current ownership | Delivery boundary |
| --- | --- | --- |
| Events | `src/modules/events/` | Creation, detail, schedule validation, covers, event list, versioned staff grants, persisted networking settings, named Wefters and administrator-managed availability |
| Attendees | Event CSV and attendee-record code in `src/modules/events/`, plus `src/modules/attendees/` | Event guest/import records and event-local canonical identities belong to Events; authorized Owners/Organizers correct details and review exact-contact duplicates. The global People screen remains an empty state |
| Organizations | `src/modules/organizations/` | Local memberships, Console access, Team invitations, initial customer/Owner provisioning |
| Network | `src/modules/network/` | Screen boundary; relationship exploration and introductions remain product direction |
| Insights | `src/modules/insights/` | Overview screen and visual components; no fabricated outcome metrics |
| Sponsors | `src/modules/sponsors/` | Partner Report screen boundary; sponsor reporting/permissions are future work |
| Staff | Event access and Wefter management in `src/modules/events/`; no dedicated module | Local staff admission, event grants, Wefter selection and Owner/Organizer-managed availability. Wefters see only their own hours; assignment workflows remain F12. |

An organization is the local tenant. Local users retain UUID identities mapped to a verified Clerk subject and configured instance. A membership connects a user to an organization with a local role and active status. Events belong to an organization; attendees and import batches belong to their event. Clerk organization mappings support provider admission, while local records determine application authority.

Local roles include Owner, Organizer, staff, and sponsor. Owners and Organizers retain organization-wide event access; both manage event grants, while Team invitations remain Owner-only. Staff receive no access from membership or event staffing alone: an active `operator` or `wefter` grant on an event is required. Operators may read granted event details and rosters; Wefters receive an allowlisted context without the roster. Sponsors remain denied operational event access. Multiple eligible organizations require explicit selection. See [shared access contracts](access-contracts.md) and verify each operation at its owning service boundary.

Initial customer provisioning creates a local-first organization, pending Owner grant, and invitation history before provider delivery. Acceptance consumes verified evidence transactionally; an external invitation or membership alone cannot assign local Owner authority. Existing-customer Team invitations use their separate owner-gated workflow. See [customer provisioning](backend/customer-provisioning.md), [Team onboarding](backend/invitation-onboarding.md), and [authentication](backend/authentication.md).

An introduction is a relationship operation/outcome within Network, not a separate top-level module. Matching, staff assignments, networking outcomes, and sponsor data access need explicit specifications before implementation. Do not infer that the conceptual Organization → Network → Event hierarchy is already a persisted schema.
