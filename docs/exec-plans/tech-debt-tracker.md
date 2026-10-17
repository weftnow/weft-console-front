# Technical debt and verification gaps

Track concrete nonblocking follow-ups here. Unmet acceptance for current work stays in its active plan. No item below authorizes live mutations or deployment.

| Gap | Impact | Next action / evidence |
| --- | --- | --- |
| Legacy plan status diverges from implemented code | Old unchecked steps can trigger duplicate work or false completion | Reconcile only the relevant item when resumed; see [legacy index](legacy/README.md) |
| Database/provider/browser onboarding acceptance remains separate | Mocked and skipped tests cannot establish live locking, delivery, or signed-in admission | Follow [verification prerequisites](../VERIFICATION.md) and [provisioning checks](../backend/customer-provisioning.md) in an authorized isolated environment |
| Design tooling/tokens differ from target guidance | Unqualified examples could cause unnecessary dependencies or inconsistent primitives | Use the implemented-baseline note in the [design system](../design/design-system.md); decide intentional expansions in a scoped plan |
| No pinned Node runtime | Provisioning's experimental TypeScript flags may differ across machines | Select and verify a supported runtime in a separate tooling change; current setup used Node 23.9.0 |
| Existing account/organization-selection tests fail | Full application verification and the prepared pre-push hook stop until resolved | On 2026-10-17, `pnpm test` reported 224 passed, 5 failed, 9 skipped. Reconcile `tests/console-account.test.mjs` and `tests/console-authorization.test.mjs` with the account control, selection resolver, and missing `/select-organization` route; failures were already recorded in the [production provisioning history](legacy/2026-10-05-production-customer-provisioning.md) |

Harness setup evidence and check failures are recorded in the [completed setup plan](completed/2026-10-17-harness-replacement.md).
