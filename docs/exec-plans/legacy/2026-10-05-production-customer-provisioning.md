# Production Customer Provisioning Implementation Plan

> Imported history; completion is unverified. Reconcile with current code and follow [the planning workflow](../../PLANS.md) before resuming. Original task records below are historical.


**Goal:** Let an internal operator create a production customer and automatically email its first Owner using the existing provisioning CLI.

**Architecture:** Extend the existing environment validation to accept an explicitly selected production target. Reuse the existing local-first provisioning service, invitation transport, admission transaction, and recovery commands. Credentials come from the invoking process or an explicitly supplied environment file.

**Tech Stack:** Node.js TypeScript stripping, pnpm, Zod, PostgreSQL/Neon, Drizzle, Clerk Backend SDK, Node test runner.

**Spec:** The requirements and production contract below extend `docs/changes/2026-10-04-customer-owner-provisioning-design.md`, specifically its deferred production enablement. The original invitation, authorization, and idempotency rules still apply.

## Requirements and proposed design

The user confirms production migrations and Clerk settings are deployed. Treat them as satisfied prerequisites; this change enables the operator command. Success means one applied create command automatically sends an invitation, and recipient acceptance grants local Owner access without another operator command.

Recommended approach: extend the existing validator and CLI rather than create a separate production script. A separate script would duplicate configuration and recovery behavior. Removing target restrictions altogether would discard the existing environment checks.

The production contract is:

| Setting | Production | Development/test |
| --- | --- | --- |
| `WEFT_PROVISION_TARGET` | Explicit `production` | Explicit `development` or `test` |
| `DATABASE_MIGRATION_URL` | Direct Neon connection to `weft_console` | Neon connection to `weft_console_test` |
| Remote TLS | Explicit `sslmode=require`, `verify-ca`, or `verify-full`; client retains certificate verification | Same explicit TLS requirement |
| `CLERK_SECRET_KEY` | Nonempty key with `sk_live_` prefix | Nonempty key; reject `sk_live_` |
| `WEFT_CLERK_INSTANCE_ID` | Exact instance identifier used by the deployed production app | Matching configured development/test identifier |
| `WEFT_APP_ORIGIN` | Canonical HTTPS origin, excluding localhost and loopback hosts | Existing canonical origin rules, including local HTTP |
| `WEFT_PROVISION_OPERATOR` | Required audit label | Required audit label |

Database names and key prefixes do not prove the correct Neon branch or Clerk instance. The operator must use the same endpoint, instance identifier, and origin as the deployed app. Do not claim the validator remotely verifies an instance/key relationship. No provider settings API is introduced.

Allow only PostgreSQL URL protocols and Neon hosts ending in `.neon.tech`. Decode the URL database path before comparing the exact database name. Reject production pooled hosts containing `-pooler.`. Permit only `sslmode`, `channel_binding`, and `application_name` query parameters, following `scripts/migrate.mjs`, so connection options cannot override the validated destination. Reject repeated query keys and nondefault `sslmode` values outside the allowed TLS list.

Apply database validation to `status` as well as mutations. `status` remains database-only and does not require a Clerk secret, app origin, or operator label. Mutations validate the full configuration before constructing a database pool or provider client.

Keep create's existing input-only dry-run: no database or provider access, no new mandatory credentials. Clearly document that it validates request fields, not deployed configuration, connectivity, or delivery. Keep the explicit `--apply --send-invitation` requirement. No interactive prompt or extra production confirmation flag is needed: explicit target, production configuration, and existing mutation flags express intent.

## Global constraints

- PostgreSQL remains authoritative for Weft roles. Initial role is fixed to `owner`; Clerk invitation role remains `org:member`.
- Retain durable request UUIDs, immutable customer inputs, seven-day invitations, local-first writes, reconciliation before resend, and consumed-grant replay protection.
- Affected roles: internal operator provisions the first Owner; authenticated recipient consumes the grant; existing Owner controls later Team invitations. Organizer, staff, and sponsor permissions do not expand.
- No schema changes, new dependencies, public bootstrap endpoint, or changes to acceptance routes are expected.
- `.env.local` remains development configuration. Never commit a production secrets file or expose credential values in errors, tests, or logs.
- Writing this plan does not send email, mutate production, change provider settings, or deploy code.

## Files and responsibilities

| File | Change |
| --- | --- |
| `src/modules/organizations/customer-provisioning/validation.ts` | Target, database URL, production key and origin checks |
| `tests/customer-provisioning-validation.test.mjs` | Configuration acceptance/rejection matrix |
| `tests/customer-provisioning-cli.test.mjs` | Production command dispatch, flag requirements, status, process guards, dry-run |
| `docs/backend/customer-provisioning.md` | Production configuration, commands, result handling, verification record |
| `docs/backend/vercel-deployment.md` | Replace obsolete development-only provisioning statement |
| `.env.example` | Explain supported targets while preserving development example values |

`scripts/provision-customer.ts` and `cli.ts` already invoke the validators; change them only if the tests uncover a missing guard. Preserve the existing exported function return shapes so callers need no refactor.

## Review focus

1. Crossed environments: production target with test DB or test key, or development target with production DB/live key, must reject before service calls.
2. PostgreSQL query parameters overriding the validated destination must reject before pool creation.
3. Production `status` must work without Clerk credentials and remain read-only.
4. Direct Node invocation must enforce the same guards as the package script.
5. Production dry-run must remain free of network access and writes even with no credentials configured.

---

### Task 1: Extend configuration validation

**Files:** Modify `validation.ts` and `tests/customer-provisioning-validation.test.mjs` listed above.

**Interfaces:** Preserve `validateProvisioningDatabaseTarget(env: NodeJS.ProcessEnv = process.env)` returning `{ databaseUrl }`, and `validateProvisioningEnvironment(env: NodeJS.ProcessEnv & { instanceId?: string } = process.env)` returning `{ databaseUrl, instanceId, appOrigin, operator }`. Preserve `parseCustomerRequest`.

- [x] Add a synthetic valid production fixture: `production`, `postgresql://fixture:fixture@ep-production.neon.tech/weft_console?sslmode=require`, `sk_live_fixture`, `ins_production`, `https://console.example.com`, and `ops@example.com`. Use no real credentials.
- [x] Add tests asserting the production fixture returns the existing configuration shape, and both development/test fixtures still pass with `weft_console_test` and explicit TLS.
- [x] Add table-driven rejection assertions for unknown/missing target, crossed database names, non-Neon host, pooled production host, unsupported protocol, missing/disabled TLS, unsupported or repeated query keys, and encoded database paths that do not decode to the required database. Assert `host`, `dbname`, `options`, and `ssl` query parameters reject.
- [x] Add full-environment tests rejecting production test keys, missing live key suffix, development/test live keys, missing instance/operator, mismatched explicit `instanceId`, production HTTP, loopback origins, embedded URL credentials, paths, query strings, and fragments. Assert existing local development HTTP still passes.
- [x] Run `node --test tests/customer-provisioning-validation.test.mjs`; expect new valid-production assertions to fail before implementation.
- [x] Implement the contract in the two existing validators using `URL` and explicit checks. Keep messages sanitized and useful: identify the setting/rule, never interpolate its secret value. The CLI's outer failure message remains sanitized.
- [x] Run the same validation suite; expect all assertions to pass.
- [x] Commit this task with `feat: validate production customer provisioning configuration`.

### Task 2: Verify all production command paths

**Files:** Modify `tests/customer-provisioning-cli.test.mjs`; adjust `cli.ts` or `scripts/provision-customer.ts` only if a missing guard is demonstrated.

**Interfaces:** Use existing `runProvisioningCommand(argv, env, dependencies)`. Inject a service spy, keeping actual database/provider clients out of unit tests. Task 1 supplies valid production configuration.

- [x] Replace the blanket production-rejection test with targeted invalid-configuration tests. Keep assertions for unknown flags, immutable role input, and missing `--send-invitation`.
- [x] Add production dispatch assertions: `create` calls `createCustomer` once with normalized input and `{ apply: true, sendInvitation: true }`; `retry`, `renew`, and `cancel` call their matching service method once with the request UUID and configured instance. Required flags remain identical in all environments.
- [x] Assert invalid production and crossed-environment inputs leave the service call list empty for every mutation. Assert credential values are absent from thrown error messages.
- [x] Add `status` with production target, valid database URL, and instance only; assert it calls only `readCustomerStatus`. Assert status rejects a wrong database and rejects mutation flags.
- [x] Add direct Node subprocess coverage using the package script's existing warning/type-stripping flags. Override the subprocess environment with synthetic production settings, remove inherited `NODE_OPTIONS`, and use an invalid target/database combination. Assert a nonzero exit and the existing sanitized failure message, without real credentials or network access.
- [x] Extend the existing package dry-run subprocess test with `WEFT_PROVISION_TARGET=production` and no provisioning credentials. Assert parsed output is `dry-run` with null local/provider IDs. Existing service tests continue proving zero dry-run repository/provider calls.
- [x] Run `node --test tests/customer-provisioning-cli.test.mjs tests/customer-provisioning-validation.test.mjs tests/customer-provisioning-service.test.mjs tests/customer-provisioning-provider.test.mjs`; expect all tests to pass. If dispatch tests pass with Task 1 alone, leave CLI/service code unchanged.
- [x] Commit this task with `test: cover production provisioning command paths`.

### Task 3: Publish the production operator instructions

**Files:** Modify `docs/backend/customer-provisioning.md`, `docs/backend/vercel-deployment.md`, and `.env.example`.

**Interfaces:** Document the existing `provision:customer` script and command flags, plus Task 1's target contract. Production values come from an explicitly selected secrets file or exported environment; scripts do not automatically load Next.js environment files. Pass the file with Node's `--env-file` option; Node rejects it inside `NODE_OPTIONS`.

- [x] Update prerequisites for all three supported targets. Keep `.env.example` values on development and describe production overrides in comments. Explain that deployed Vercel environment variables are not automatically available in a local terminal.
- [x] Document a gitignored `.env.production.local` file holding `WEFT_PROVISION_TARGET=production`, the direct production `DATABASE_MIGRATION_URL`, live `CLERK_SECRET_KEY`, deployed `WEFT_CLERK_INSTANCE_ID`, canonical `WEFT_APP_ORIGIN`, and `WEFT_PROVISION_OPERATOR`. Existing `.gitignore` already covers this file.
- [x] Add these exact operator command patterns, replacing example organization/email when used:

```bash
# Generate once and retain this UUID for this customer.
PROVISION_REQUEST_ID="$(uuidgen)"

# Input-only preview; validates neither connectivity nor delivery.
node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts create \
  --request-id "$PROVISION_REQUEST_ID" \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com"

# Create the customer and automatically send the Owner invitation.
node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts create \
  --request-id "$PROVISION_REQUEST_ID" \
  --organization-name "Acme Summit" \
  --owner-email "owner@example.com" \
  --apply --send-invitation

node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts status \
  --request-id "$PROVISION_REQUEST_ID"

node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts retry \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply --send-invitation

node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts renew \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply --send-invitation

node --env-file=.env.production.local \
  --disable-warning=ExperimentalWarning \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --experimental-strip-types \
  scripts/provision-customer.ts cancel \
  --request-id "$PROVISION_REQUEST_ID" \
  --apply
```

- [x] Explain that exported variables take precedence over env-file values; use a terminal without conflicting development variables. When all production variables are already exported, omit `--env-file`. Do not regenerate the request UUID on retry.
- [x] Document `sent` as Clerk acknowledging an invitation, not proof of inbox delivery; `unknown` requires status/reconciliation, not a new request ID. `consumed` means local Owner admission committed. Recipient acceptance is automatic and requires no follow-up provisioning command.
- [x] Replace the obsolete development-only sentence in deployment docs. Record user-confirmed deployed migrations/settings separately from historical implementation verification; do not claim this plan verified production delivery.
- [x] Commit this task with `docs: document production owner provisioning commands`.

### Task 4: Verify and hand off

- [x] Run `pnpm lint`; expect exit 0.
- [x] Run `pnpm typecheck`; expect exit 0.
- [ ] Run `pnpm test`; expect exit 0 and record database suites skipped without an isolated `DATABASE_TEST_URL`. Never point test suites at production. Actual result: exit 1, 212 passed, 5 failed, 9 skipped; failures are existing Console account/organization-selection tests outside the changed files.
- [x] Inspect the final diff against this contract. Confirm production `create`, `status`, `retry`, `renew`, and `cancel` work through existing validators; development/test stay scoped; no migration or route changes were added.
- [x] Deliver the runnable production command and required configuration. Identify any skipped live/database checks explicitly.

Production acceptance verification, when the user requests an actual customer invitation: use the intended customer name/email and a retained UUID; run create; confirm `sent`; recipient accepts at the production origin; confirm Owner dashboard and Team access; read status and confirm `consumed`. Check organizer/staff/sponsor accounts still lack invitation management access. Reuse development or an isolated test environment for destructive cancellation, renewal, and demotion/replay cases. Do not run synthetic recovery experiments on a real customer.

## Plan review

The four tasks cover production target validation, all command paths, operator configuration and recovery, and required repository checks. Production migrations/settings are treated as deployed per the user. Existing service/admission behavior supplies the local-first flow and Owner authorization; this plan changes environment eligibility and tests that existing guards remain effective. Next.js documentation must be read if implementation expands into framework code, per AGENTS.md.
