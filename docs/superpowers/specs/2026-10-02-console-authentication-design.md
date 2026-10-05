# Console authentication and Neon access design

Status: proposed for review; implementation has not started.

## Outcome

The entire Console requires an active Clerk session. Invitation-only registration remains enforced by Clerk. A successful login identifies a person; Neon determines whether that person has an active Weft membership and which organization and capabilities they can access.

Clerk application: `app_3K9Cnx185cBaBgyMM441dY68SQ9` (Weft Console). Its development instance is configured with `auth_access_control.sign_up_mode = restricted`. Production is not configured yet and needs the same restriction at release.

## Current implementation

- Next.js 16.3.5, Clerk Next.js SDK 7.9.10, React 19.2.8, Drizzle, PostgreSQL on Neon.
- `src/proxy.ts` initializes Clerk and matches API and `/__clerk` requests. It does not require authentication.
- `/`, `/events`, `/network`, `/people`, and `/partner-report` render without session checks. Much of their content is static demonstration data.
- `getCurrentUser()` returns `null`. Create Event, Event Detail, event covers, and CSV import handlers already use this boundary and enforce organization permissions in their services.
- Neon stores local UUID users, organizations, and active memberships with roles `owner`, `organizer`, `staff`, and `sponsor`. User records have no Clerk identity mapping yet.
- Imported event guests are attendee records, never Console accounts.

## Access rules

| Surface | Required behavior |
| --- | --- |
| `/sign-in` and nested Clerk flow routes | Public authentication screens |
| `/sign-up` and nested Clerk flow routes | Public route; Clerk requires an invitation for registration |
| Static public assets, Next internals, `/__clerk` | Available for authentication and page delivery; no business data |
| `/`, `/events`, `/network`, `/people` | Active session, mapped local user, active owner/organizer membership in selected organization |
| `/events/new` | Active session and mapped user; preserve creator membership checks and organization selection in the existing form |
| `/events/[eventId]` | Active session and mapped user; event organization determines permission, independently of the selected organization cookie |
| `/partner-report` | Active session; show a neutral unavailable state until sponsor participation and report authorization are modeled. Do not render the existing unscoped fixture report |
| `/access-required` | Active session; account has no mapping, no membership, or no implemented workflow for its role; allow logout |
| Existing `/api/events` handlers | Anonymous/pending session: JSON 401; unmapped/disabled identity or insufficient membership: JSON 403; preserve existing error envelope and checks |

The signed-out root must redirect to `/sign-in` before dashboard content is rendered. Deep links, RSC requests, prefetch requests, and browser navigation receive the same checks. Pending sessions are treated as signed out and must complete Clerk's sign-in flow.

Use resource-level server checks in every dashboard page and every read/mutation boundary. Layouts and client visibility are not security boundaries. Keep `clerkMiddleware()` for session integration; do not depend on deprecated `createRouteMatcher()` or add database work to Proxy. Every newly added business page must use the shared page guard, enforced by a route-inventory regression test.

## Neon identity mapping

Add `user_auth_identities` to the existing identity schema, leaving `users.id` and its references intact:

- `id`: UUID primary key.
- `user_id`: existing local UUID user, foreign key with restrict deletion.
- `provider`: text constrained to `clerk` for this integration.
- `instance_id`: nonempty Clerk instance ID.
- `subject`: nonempty Clerk user ID.
- `disabled_at`: nullable timestamp; disabled mappings cannot resolve an actor.
- `created_at`: timestamp.
- Unique `(provider, instance_id, subject)` and `(user_id, provider, instance_id)`.

Configure a server-only `WEFT_CLERK_INSTANCE_ID` alongside each deployment's Clerk keys. It must match the instance those keys belong to. Production and development identities never share mappings implicitly.

`getCurrentUser()` verifies an active Clerk session with `await auth()`, then queries this mapping and the local user. No active session returns `null` before any database access. Missing or disabled mappings throw a controlled `FORBIDDEN` application error. Missing instance configuration or database failure fails closed with a sanitized server error. Return the existing `{ id, displayName, avatarUrl }` shape, preserving all event ownership/audit UUID references.

Use request-scoped memoization only; never put authentication or membership results into a shared cross-request cache. Store no Clerk session tokens, passwords, or roles in Neon identity records.

## Provisioning and invitation lifecycle

For the pilot, use deliberate provisioning rather than automatic account linking or webhook-dependent authorization:

1. Administrator sends an application invitation through Clerk Dashboard. Sending invitations is a separate explicit administrative action, not part of executing this implementation plan.
2. Recipient accepts and gets a verified Clerk account. Login initially reaches `/access-required` if no mapping exists.
3. Administrator retrieves the exact Clerk subject and instance from Clerk, then runs a development/test provisioning command to create a local user or link an explicitly specified existing local UUID. Never infer a link from matching email.
4. Administrator assigns the existing organization and role through the membership provisioning command. Invitation acceptance alone grants no membership.
5. Subsequent login resolves the local actor. Membership or mapping revocation takes effect on the next protected request without waiting for a new Clerk token.

Provisioning must be transactional and repeatable, reject identity reassignment and conflicting local-user links, and preserve existing memberships, event creator IDs, and import provenance. Local commands retain explicit development/test targeting; production uses a separately authorized release process. No first-user owner promotion, domain-based promotion, or client-provided role assignment.

Clerk profile/account controls display the authenticated person; local display name/avatar are initially supplied through provisioning. Automated profile synchronization and user lifecycle webhooks can be added later without becoming a source of membership authority.

## Organization and dashboard context

Add server queries for active memberships and a shared organization access operation. A single eligible membership is selected automatically. Accounts with multiple active memberships cannot open the Console until organization switching is supported. An HttpOnly, SameSite=Lax cookie stores the local user UUID and organization UUID selected during invitation completion (Secure in production). Treat that value as untrusted: every access checks its user matches the verified actor and rechecks active membership and role. A forged or stale cookie must not reveal organization metadata.

The selector action requires the session and local actor, validates the UUID, and verifies active membership before writing the cookie. Selection controls the dashboard context, not permission to operate on an event in another organization. Existing event services continue to derive the organization from their resource or explicitly validated form input.

Replace the sidebar's hardcoded Nick/Organizer profile with Clerk account controls and server-derived local user, organization, and role. A minimal safe context DTO may be passed to client components; it contains no tokens or identity-provider secrets. Navigation reflects supported capabilities, and page checks independently enforce them. Staff and sponsor memberships do not confer organizer privileges; unsupported workflows receive an account access state with logout and organization switching.

Overview, Events listing, Network, and People currently render fixtures. Protect those views and visibly label their fixture content as demo data, without presenting it as records from the selected Neon organization. Live Create Event, Event Detail, covers, and attendee imports use Neon and the verified local actor. Converting all dashboard analytics, the event listing, People, and Network fixtures into live queries is separate feature work with domain-specific data contracts; authentication must not manufacture those models or seed other tenants with fixture records.

## Errors, redirects, and session transitions

- Signed-out page requests go to Clerk sign-in with a safe same-origin return destination; successful sign-in returns to the intended page or `/`.
- Signed-in but unprovisioned users go to `/access-required`, which checks Clerk directly and does not recurse through the local-user guard.
- Mapped users with no active memberships get an access state; they never see the organizer dashboard.
- Invalid or stale organization selection clears the selection and routes to the access state without exposing unrelated organizations.
- Database or auth configuration outages show a generic unavailable state or sanitized API 500; they must not become anonymous/demo fallbacks.
- Logout returns to `/sign-in`; refresh and client navigation must not render fresh protected content after logout. Clear the invitation-selected organization on logout and clear user-specific client state on account changes. Content already delivered to a browser cannot be retroactively removed.

## Environments and validation

Runtime uses the existing pooled Neon connection. Migration/provisioning uses the direct development connection to `dev/weft_console_test`. Production is `production/weft_console`; the separate Alembic-managed `weft` database is out of scope.

Generate a new forward Drizzle migration and metadata; never rewrite `0000` or `0001`. Inspect the target schema and journal read-only before applying it. Live database tests must not overlap app/preview usage of the shared development database; destructive migration checks use an isolated schema or scratch database.

Validate anonymous and pending sessions, unprovisioned users, each role, multiple organizations, stale selection, membership revocation, forged actor/organization input, identity conflicts, deep links/RSC/prefetch, protected images, logout/account switching, and unavailable infrastructure. Existing Create Event and CSV transaction protections must remain intact.

## Deferred work

Custom authentication branding, an invitation-management UI, automatic webhook profile synchronization, production deployment, staff operational dashboards, sponsor participation/report authorization, and full dashboard data persistence.

## References

- Local Next.js authentication guide: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (DAL checks, layout limitations, request-scoped caching).
- [Clerk middleware and resource-level protection](https://clerk.com/docs/reference/nextjs/clerk-middleware).
- [Clerk server auth API](https://clerk.com/docs/reference/nextjs/app-router/auth).
- [Clerk invitation-only access](https://clerk.com/docs/guides/secure/restricting-access).
- [Identity storage and database synchronization](https://clerk.com/docs/guides/development/webhooks/syncing).
- `ARCHITECTURE.md`, `docs/backend/create-event.md`, `docs/backend/attendee-imports.md`.
