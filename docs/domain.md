# Console domain ownership

This map summarizes existing [product intent](product.md) and [implemented architecture](../ARCHITECTURE.md). It does not grant new permissions or define unimplemented workflows.

| Capability | Current ownership | Delivery boundary |
| --- | --- | --- |
| Events | `src/modules/events/` | Creation, detail, schedule validation, covers, event list, Kami configuration and preview |
| Attendees | Event CSV code and `src/modules/attendees/` | Persisted attendees/import batches belong to Events today; the global People screen is an empty state |
| Organizations | `src/modules/organizations/` | Local memberships, Console access, Team invitations, initial customer/Owner provisioning |
| Network | `src/modules/network/` | Screen boundary; relationship exploration and introductions remain product direction |
| Insights | `src/modules/insights/` | Overview screen and visual components; no fabricated outcome metrics |
| Sponsors | `src/modules/sponsors/` | Partner Report screen boundary; sponsor reporting/permissions are future work |
| Staff | No dedicated module | Future live introduction coordination; do not scaffold a module without a concrete workflow |

An organization is the local tenant. Local users retain UUID identities mapped to a verified Clerk subject and configured instance. A membership connects a user to an organization with a local role and active status. Events belong to an organization; attendees and import batches belong to their event. Clerk organization mappings support provider admission, while local records determine application authority.

Local roles include Owner, Organizer, staff, and sponsor. Current Console eligibility accepts active Owner or Organizer memberships in the selected organization; ambiguous or ineligible selection fails closed. Owner-only Team management is narrower than general Console access. Staff and sponsor product intent does not imply current Console permission. Check the owning service, access resolver, and tests for each operation rather than inferring access from navigation.

Initial customer provisioning creates a local-first organization, pending Owner grant, and invitation history before provider delivery. Acceptance consumes verified evidence transactionally; an external invitation or membership alone cannot assign local Owner authority. Existing-customer Team invitations use their separate owner-gated workflow. See [customer provisioning](backend/customer-provisioning.md), [Team onboarding](backend/invitation-onboarding.md), and [authentication](backend/authentication.md).

An introduction is a relationship operation/outcome within Network, not a separate top-level module. Matching, staff assignments, networking outcomes, and sponsor data access need explicit specifications before implementation. Do not infer that the conceptual Organization → Network → Event hierarchy is already a persisted schema.
