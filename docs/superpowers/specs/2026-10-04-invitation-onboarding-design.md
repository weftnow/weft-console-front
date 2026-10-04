# Invitation onboarding design

Status: implementation prepared; live integration verification remains pending. The repository changes do not authorize live provider settings, database migration application, owner bootstrap, or real invitation delivery.

## Outcome

An organization owner invites a teammate with a chosen Weft role. The recipient accepts, creates an account or signs in, and enters that organization's Console without an administrator running per-user scripts. Existing Clerk accounts, including the account currently stuck on `/access-required`, can accept an organization invitation without creating another account.

The invitation specifies the organization and role before delivery. Authentication proves who accepted; it never invents permissions. Existing UUIDs, event ownership and Neon permission checks remain intact.

## Approach and scope

Use Clerk Organization invitations for email delivery and account acceptance, with a Neon invitation ledger controlling the actual Weft grant. Add an instance-scoped mapping between existing Neon organizations and Clerk Organizations. Do not migrate business authorization to Clerk roles or session claims.

Alternatives considered: application invitation metadata is smaller but centered on account creation and does not solve existing users joining another organization; implementing local invitation tokens and an email provider adds another delivery and authentication integration. Clerk Organization invitations cover both account states using the installed SDK.

Enable Clerk Organizations with **Membership optional**, keep restricted registration and email enabled, and disable end-user organization creation and automatic domain enrollment. These are rollout prerequisites, not changes performed while writing the plan. All transport memberships use `org:member`; Weft owner/organizer roles remain only in Neon. Do not expose Clerk Organization management components as Weft team administration.

First release: active Neon owners can invite `owner` or `organizer`, list invitation history and revoke pending invitations. Organizers, staff and sponsors cannot manage invitations. Do not offer staff/sponsor invitations until their destinations are implemented. Public organization creation, member removal, role editing, account merging and profile synchronization are separate work.

No webhook is necessary for correctness. Acceptance calls a server mutation that checks Clerk directly and provisions transactionally. A recovery screen repeats this operation after interrupted navigation or a temporary outage. Normal protected reads never create users or memberships.

## Data

Add `organization_auth_identities`: UUID primary key, local organization FK with restrict deletion, provider constrained to `clerk`, instance ID, Clerk organization subject, created timestamp. Unique `(provider, instance_id, subject)` and `(organization_id, provider, instance_id)`.

Add `organization_invitations`: UUID primary key, local organization FK, instance ID, normalized recipient email, invited role restricted to `owner|organizer`, inviter local user FK, nullable Clerk invitation ID, status `pending|accepted|revoked|expired`, delivery state `queued|sending|sent|unknown|failed`, delivery lease timestamp, created timestamp, expiry timestamp, accepted timestamp, accepted Clerk subject and accepted local user FK. Store sanitized error codes, never tickets, secrets or full provider errors. Enforce one pending invitation per organization/instance/normalized email with a partial unique index. Preserve expired/revoked history; fresh sends create fresh rows. Enforce coherent accepted fields and allowed state transitions in the repository.

Normalize invitation addresses with trim and lowercase; do not strip dots or plus aliases. Use Zod email validation and a 254-character maximum. Invitations expire after **7 days**. The provider acceptance time must be within that window; local completion after timely acceptance may occur later. Fresh admission requires the inviter still to be an active owner at completion. Owner removal invalidates their unconsumed invitations.

## Send and revoke

The Team page belongs to the selected Neon organization. The server rechecks current owner membership on every send, retry and revoke; client inputs cannot select the acting user or bypass organization scope.

Persist the local invitation before calling Clerk. Send `org:member`, `expiresInDays: 7`, `publicMetadata: { weftInvitationId: <local UUID> }` and a server-built redirect to `/accept-invitation?invitation=<UUID>`. Do not send the Weft role as provider authority. Build URLs from a validated server-only `WEFT_APP_ORIGIN`, never an untrusted Host header or user URL. Omit `inviterUserId`; the Backend API service owns delivery, while Neon records the actual authorizing owner.

Provider calls run outside database transactions. A durable lease prevents concurrent sends. On timeout or a crash after provider success, mark delivery unknown; reconciliation pages through provider invitations for the mapped organization and matches the exact server-set correlation UUID. Attach the existing invitation instead of blindly sending again. Recipient completion can recover a missing provider ID through this same correlation. A retry that cannot establish whether delivery happened stays unknown and offers retry later; it must not claim that email was sent.

Duplicate pending sends return the existing record without changing its role or emailing again. Requests for existing active Neon members report “Already a member”; do not change their role. Inactive membership or disabled identity is an administrative conflict; do not reactivate through invitations. An expired or revoked invitation can be replaced after reconciliation confirms the provider permits a fresh invite. Do not implement a speculative resend API: retry failed delivery or revoke and send a fresh invitation explicitly.

Revoke locally first under a row lock, then revoke the provider invitation. If provider revocation fails, the local status still prevents Weft admission and the Team page shows provider cleanup pending. Acceptance and revocation serialize on the same row: whichever local transaction commits first wins. Revoking an already locally accepted invitation reports “Already accepted” and does not remove membership; member removal is outside this release.

## Acceptance and identity provisioning

`/accept-invitation` is a public authentication entry point. Handle Clerk's `sign_in`, `sign_up` and `complete` statuses using the current prebuilt authentication components, preserving the ticket and local invitation locator through authentication. Query parameters are locators only, never proof of admission. After an active session exists, invoke a Server Action; do not mutate Neon or cookies in a Server Component GET/render.

The server derives the subject from the active Clerk session and reads the user and organization membership from Clerk's Backend API. Admission requires:

1. The local ledger row and organization mapping belong to the configured instance.
2. The provider invitation is accepted and has the exact correlation UUID and mapped provider organization.
3. The provider membership belongs to the current subject and carries that exact correlation UUID.
4. The invited address is among the current user's verified Clerk email addresses. This checks invitation ownership; it never links an existing local user by email.
5. Provider acceptance occurred within the invitation window, and the local invitation remains consumable and its inviter remains an active owner.

Verify `publicUserData.userId`, not merely the membership's display identifier. Reject incomplete or mismatched provider evidence. Use provider membership `createdAt` as the acceptance timestamp for a fresh membership; an already-existing provider membership is a conflict rather than evidence of a newly accepted invite.

In one Neon transaction, lock the invitation and serialize by `(instance, subject)` to cover acceptance of different invitations concurrently. Recheck local status and inviter membership under locks. Reuse an enabled exact identity mapping or create a new UUID user and mapping. Never infer an existing local UUID from email, reassign identities, or bypass `disabled_at`. Initial display name is Clerk full name trimmed and bounded to 160 characters, falling back to the invited address; accept only HTTPS avatar URLs or store null. Do not overwrite an existing profile.

Create the invited membership only if none exists. Preserve existing active membership roles; reject inactive memberships. Mark the invitation accepted with the exact subject and local user. A repeat completion by the same subject returns the previous result only if that membership remains active and identity remains enabled; never regrant a revoked membership. A different subject cannot replay acceptance. All writes roll back on failure.

After commit, the Server Action sets the existing user-bound organization-selection cookie for the invited organization and redirects to `/`. Cookie validation and resource-level checks continue to use Neon. No Clerk active-organization claim is used as Weft authorization.

## Recovery and errors

On `/access-required`, a server read can discover pending local invitations using verified Clerk addresses and exact provider membership evidence, then render a dedicated completion component. Discovery creates nothing. The component automatically submits the completion action once, presents “Setting up your access…” and offers a retry after failure. Also provide `/onboarding` with the same component for existing mapped users recovering access to a second organization. Existing users can reach it from their account menu; it lists only invitations proven to belong to that subject.

No eligible evidence keeps the neutral access state with sign-out and “Ask your organization owner to invite you.” A bare application invitation or `user.created` event grants no organization. Expired/revoked links show “This invitation is no longer available.” A wrong account can sign out and continue with the invited account. Network/database errors show “We couldn't finish setting up your access. Try again.” Pending Clerk sessions complete their authentication tasks before any mutation.

Acceptance normally selects the invited organization directly, even when the user belongs to several. Interrupted recovery with several proven invitations lets the user choose; completing one does not accept the others. Redirections are same-origin and restricted to `/`, `/onboarding` or the validated local acceptance URL. Tickets must be removed from the URL after authentication and excluded from logs/analytics/referrers.

## Rollout and existing accounts

Preserve existing users, memberships and scripts for exceptional operations. Prepare mappings for existing organizations through a dry-run-first, development/test-only setup command, recovering provider organizations using exact server-written local organization UUID metadata. This is organization setup, never per-recipient provisioning.

The first trusted owner must be established explicitly for an organization; never promote the first signed-in user. Existing pilot owner mappings can seed this. If the current environment has no owner, the operator supplies the exact Clerk subject, organization UUID and approved local-user linkage once using existing provisioning tools. Then send the affected account an organization invitation from Team; acceptance automatically provisions it. A historical application invitation without an organization and role cannot be retroactively interpreted as a Weft grant.

Live settings changes, migration, first-owner bootstrap and test invitation delivery are separate execution steps with explicit environment targeting. Production deployment and real invitation emails are outside this planning task. Before release, verify restricted signup still works with Organization invitation tickets for new users; failure is a release blocker, not a reason to enable public signup.

## Verification and sources

Test owner-only administration, new and existing accounts, multiple organizations, secondary verified email, alias mismatch, disabled identities, revoked/inactive membership, expired links, timely acceptance completed late, replay, concurrent completion, lost provider responses, revocation races, pagination, wrong-account switching, interrupted authentication and provider/database outages. Run lint, typecheck and all tests, plus isolated transactional database cases and signed-in browser acceptance before shipping.

Repository references: `docs/backend/authentication.md`, `ARCHITECTURE.md`, `src/infrastructure/database/schema/identity.ts`, `src/infrastructure/auth/console-page-context.ts`, `src/modules/organizations/console-access.ts`, `tests/load-ts.mjs`. Referenced `docs/domain.md`, `docs/engineering.md` and `docs/adr/` do not currently exist; do not invent their requirements.

Framework references read locally: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `01-app/01-getting-started/07-mutating-data.md`, `01-app/03-api-reference/04-functions/cookies.md`. Confirm component ticket handling against the installed Clerk SDK during implementation; do not copy legacy hooks.

Provider references checked 2026-10-04:
- [Organization invitation delivery and metadata](https://clerk.com/docs/guides/organizations/add-members/invitations)
- [Create organization invitation parameters](https://clerk.com/docs/reference/backend/organization/create-organization-invitation)
- [Invitation authentication statuses](https://clerk.com/docs/guides/development/custom-flows/organizations/accept-organization-invitations)
- [Organization membership lookup](https://clerk.com/docs/reference/backend/organization/get-organization-membership-list)

These sources support transport and acceptance mechanics. Neon state transitions, owner-only permissions, the seven-day lifetime and the recovery design are Weft design decisions.
