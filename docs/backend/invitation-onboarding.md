# Organization invitation onboarding

This document describes the owner-managed invitation lifecycle in the Weft Console and the steps still required to enable it in an environment.

## Access and roles

Only an active Neon organization owner can open **Team**, send invitations, retry delivery or revoke a pending invitation. The page and each Server Action derive the selected organization and local user from the current server context. Submitted values cannot select an organization, actor or permission. The supported Weft roles are `owner` and `organizer`; staff and sponsor invitations are not available.

Neon remains authoritative for Console identity, memberships and roles. Clerk Organization invitations provide email delivery and account authentication. Every Clerk invitation uses `org:member`; the chosen Weft role remains in the local invitation ledger.

## Delivery and recovery

The local invitation is recorded before Clerk is called. A duplicate pending request returns that row without changing its role or sending another email. A provider timeout records an unknown outcome. Retry searches Clerk's paginated invitation list for the exact local invitation UUID before any new send. If it cannot prove the prior outcome, the row remains unknown.

The invitation expires after seven days. Revocation marks the local record revoked before calling Clerk. A provider cleanup error is shown to the owner, while local admission remains denied. Replaying an accepted provider invitation cannot restore a revoked local membership or a disabled identity.

After Clerk authentication completes its required tasks, the acceptance page removes the ticket from the URL and invokes an explicit Server Action. The transaction checks exact instance, organization mapping, invitation correlation, verified invited email, provider membership, acceptance time and active inviter. It either creates a local UUID mapping or reuses the enabled exact mapping. It never links by email or overwrites an existing profile. On commit, the browser's user-bound organization selection points to the invited organization.

The access-required page and `/onboarding` can discover only accepted invitations proven for the current Clerk subject. Discovery is read-only. A single eligible invitation can finish automatically; multiple invitations require the user to choose an organization.

## Environment preparation

Before rollout, an operator must complete each of these steps in the intended development instance:

1. Enable Clerk Organizations with Membership optional. Keep restricted registration and email sign-up enabled. Disable end-user organization creation and automatic domain enrollment.
2. Set `WEFT_CLERK_INSTANCE_ID` to the matching server-only instance identifier and `WEFT_APP_ORIGIN` to the canonical Console origin.
3. Apply the generated invitation migration through the approved migration workflow.
4. Run the organization bridge setup in dry-run mode with exact existing local organization UUIDs. Review the provider organization matches and target. Apply only after explicit environment authorization.
5. Provision new customers and their initial Owner through the local-first internal CLI in [customer provisioning operations](customer-provisioning.md). Never promote the first signed-in user. Existing organizations still require an explicitly approved active local owner before the Team page can send invitations.
6. Verify Clerk's restricted-signup invitation ticket flow using approved development test accounts before release.

The setup script is dry-run by default. Example preparation command:

```bash
WEFT_PROVISION_TARGET=development pnpm exec node --env-file=.env.local --experimental-strip-types scripts/setup-clerk-organizations.ts \
  --instance-id ins_development \
  --organization-id 11111111-1111-4111-8111-111111111111
```

An apply requires `--apply`, `WEFT_PROVISION_TARGET=development|test`, an explicit instance ID, exact local organization UUIDs, Clerk credentials and the direct migration connection to Neon `weft_console_test`. It creates or recovers only provider organizations and local organization mappings. It does not create users, owners or memberships. New customer provisioning uses the separate CLI described in [customer provisioning operations](customer-provisioning.md).

## Required live verification

The implementation work did not change Clerk settings, apply migrations, run organization setup, provision a customer or deliver email. Before release, verify the flow in an explicitly authorized development instance for a new account, an existing signed-out account, an already signed-in account, a secondary verified email, a second organization, a wrong-account switch, pending session tasks, and seven-day expiry. Exercise owner and organizer roles, restricted public signup, delivery timeout recovery, database outage recovery, local revocation replay and refresh after interruption. Initial customer provisioning is documented separately in [customer provisioning operations](customer-provisioning.md).

The installed SDK and local code were inspected, and mocked transport, service, completion and Server Action tests cover the defined checks. No isolated `DATABASE_TEST_URL` was configured in this implementation session, so actual concurrent database transactions and rollback behavior remain unverified. The browser ticket flow and real delivery remain unverified as well. Do not describe onboarding as end-to-end verified until those environment-specific scenarios pass.
