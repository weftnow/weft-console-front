# Technical debt and verification gaps

Track concrete nonblocking follow-ups here. Unmet acceptance for current work stays in its active plan. No item below authorizes live mutations or deployment.

| Gap | Impact | Next action / evidence |
| --- | --- | --- |
| Turbopack loader-worker port restriction in the current macOS execution environment | Nonblocking: the shared local/Vercel production build explicitly uses supported Webpack and keeps full hook checks | Reassess Turbopack after the upstream environment issue is resolved. Approved parent/child Node port probes pass, but the Turbopack worker returns `EPERM`; see the [completed UI/build repair](completed/2026-10-18-f01-f03-ui-repair.md). |
| Legacy plan status diverges from implemented code | Old unchecked steps can trigger duplicate work or false completion | Reconcile only the relevant item when resumed; see [legacy index](legacy/README.md) |
| Database/provider/browser onboarding acceptance remains separate | Mocked and skipped tests cannot establish live locking, delivery, or signed-in admission | Follow [verification prerequisites](../VERIFICATION.md) and [provisioning checks](../backend/customer-provisioning.md) in an authorized isolated environment |
| Design tooling/tokens differ from target guidance | Unqualified examples could cause unnecessary dependencies or inconsistent primitives | Use the implemented-baseline note in the [design system](../design/design-system.md); decide intentional expansions in a scoped plan |
| No pinned Node runtime | Provisioning's experimental TypeScript flags may differ across machines | Select and verify a supported runtime in a separate tooling change; current setup used Node 23.9.0 |
| F03 reduced-motion runtime check | Existing reduced-motion CSS was inspected, but the available browser controls did not support media emulation | Recheck the roster/editor with reduced motion enabled during the next browser acceptance pass; desktop/narrow layout and keyboard saves passed on 2026-10-18 |
| Existing account/organization-selection tests fail | Full application verification and the prepared pre-push hook stop until resolved | On 2026-10-17, `pnpm test` reported 224 passed, 5 failed, 9 skipped. Reconcile `tests/console-account.test.mjs` and `tests/console-authorization.test.mjs` with the account control, selection resolver, and missing `/select-organization` route; failures were already recorded in the [production provisioning history](legacy/2026-10-05-production-customer-provisioning.md) |

Harness setup evidence and check failures are recorded in the [completed setup plan](completed/2026-10-17-harness-replacement.md).
