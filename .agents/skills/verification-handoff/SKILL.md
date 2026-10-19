---
name: verification-handoff
description: Verify a requested repository change and prepare an evidence-based handoff using the existing verification policy. Use when asked to validate work, finish a change, or report verification gaps.
---

# Verification handoff

For Weft, follow [Verification](../../../docs/VERIFICATION.md) and [active plans](../../../docs/exec-plans/active/). Use `pnpm verify`; add `pnpm build` for application/build changes. Verify allowed and denied local-role and organization paths when affected. PostgreSQL owns permissions; Clerk membership is insufficient. Database tests require the explicit disposable target and gate; skipped suites and mocked provider calls cannot establish live acceptance. Record nonblocking follow-ups in [the debt tracker](../../../docs/exec-plans/tech-debt-tracker.md).

Read AGENTS.md, docs/VERIFICATION.md, the relevant active plan, and requested diff. Inspect affected code/tests to identify observable acceptance and covering commands/scenarios. Preserve unrelated work.

Run checks prescribed for the change, including focused behavior tests and the required aggregate suite. Broaden only for failures, new edits, or unresolved concerns. Hooks can supply evidence, but check their scope: working-tree checks do not establish an exact staged/pushed revision.

Exercise the real boundary when required. Browser previews do not prove native IPC, mocks do not prove a live integration, and a running process does not prove usable UI. Use isolated synthetic data and documented cleanup/recovery. Respect bounded retries; never replay uncertain mutations blindly.

Before local browser acceptance, follow the [runtime preflight and recovery guide](../../../docs/engineering.md#local-runtime-and-authentication-troubleshooting). Check hostname consistency, build/runtime environment precedence, and the rendered Clerk form. Diagnose matching server/browser errors before declaring authentication blocked; record the cause, recovery, and observed result.

Record exact commands/results, skipped/zero-test runs, prerequisite failures, and remaining manual checks. Fix scoped failures; report pre-existing or external blockers without weakening checks.

Update the active plan before handoff with progress and next action. Complete/archive only after all criteria pass, repairing links and recording nonblocking follow-ups. Report the change and reason, actual verification, and material gaps. Unexecuted checks have not passed.
