# Technical debt and verification gaps

Track concrete nonblocking follow-ups here. Unmet acceptance for current work stays in its active plan. No item below authorizes live mutations or deployment.

| Gap | Impact | Next action / evidence |
| --- | --- | --- |
| Turbopack plugin-thread option is experimental | Restricted local runners use an explicit opt-in; normal development and Vercel retain default Turbopack behavior | Recheck `experimental.turbopackPluginRuntimeStrategy` when upgrading Next.js; remove the local option when the IPC permission issue is resolved. See the [completed UI/build repair](completed/2026-10-18-f01-f03-ui-repair.md). |
| Legacy plan status diverges from implemented code | Old unchecked steps can trigger duplicate work or false completion | Reconcile only the relevant item when resumed; see [legacy index](legacy/README.md) |
| Database/provider/browser onboarding acceptance remains separate | Mocked and skipped tests cannot establish live locking, delivery, or signed-in admission | Follow [verification prerequisites](../VERIFICATION.md) and [provisioning checks](../backend/customer-provisioning.md) in an authorized isolated environment |
| Design tooling/tokens differ from target guidance | Unqualified examples could cause unnecessary dependencies or inconsistent primitives | Use the implemented-baseline note in the [design system](../design/design-system.md); decide intentional expansions in a scoped plan |
| No pinned Node runtime | Provisioning's experimental TypeScript flags may differ across machines | Select and verify a supported runtime in a separate tooling change; current setup used Node 23.9.0 |
| F03 reduced-motion runtime check | Existing reduced-motion CSS was inspected, but the available browser controls did not support media emulation | Recheck the roster/editor with reduced motion enabled during the next browser acceptance pass; desktop/narrow layout and keyboard saves passed on 2026-10-18 |
| Existing account/organization-selection tests fail | Full application verification and the prepared pre-push hook stop until resolved | On 2026-10-17, `pnpm test` reported 224 passed, 5 failed, 9 skipped. Reconcile `tests/console-account.test.mjs` and `tests/console-authorization.test.mjs` with the account control, selection resolver, and missing `/select-organization` route; failures were already recorded in the [production provisioning history](legacy/2026-10-05-production-customer-provisioning.md) |
| F07 engine configuration is deployment work | The status panel reports "isn’t connected" until `WEFT_ENGINE_URL` and `WEFT_ENGINE_SERVICE_TOKEN` are set for the Console and the engine grants are applied by an operator | Follow the [F07 plan](active/2026-10-19-f07-automatic-matching-updates.md) end-to-end acceptance before enabling automatic processing |
| Settings and Wefter edits write no change row | They only make a running or later engine run stale; they do not trigger matching | Add change kinds if product wants them to trigger matching |

Harness setup evidence and check failures are recorded in the [completed setup plan](completed/2026-10-17-harness-replacement.md).
