---
name: harness-maintenance
description: Audit or repair stale repository instructions, documentation maps, plan workflows, verification commands, and skill references when the harness drifts. Use for harness maintenance requests or demonstrated instruction/check drift, not every code edit.
---

# Harness maintenance

For Weft, use [the documentation index](../../../docs/README.md), [planning policy](../../../docs/PLANS.md), [active plans](../../../docs/exec-plans/active/), [hooks](../../../docs/HOOKS.md), and [the harness manifest](../../../scripts/harness.json). Run `pnpm check:docs` and `pnpm test:harness` for checker or hook edits, plus the required aggregate checks. Keep the generated Next.js block and AGENTS.md at most 100 lines. Historical plans under legacy are unverified. A second setup should reuse these paths and commands.

Read AGENTS.md and relevant docs, active plans, manifests, CI, check scripts, hooks, and skill catalog. Compare claims against actual files/commands. Inspect existing changes first.

Identify concrete drift: broken links, competing canonical docs, stale paths/commands, duplicated instructions, missing check coverage, or a plan status inconsistent with remaining acceptance. Prioritize demonstrated failures.

Repair within scope and document ownership rules. Keep AGENTS.md concise and detail in canonical docs. Preserve user requirements; distinguish target architecture from implementation. For protected owner docs, record proposed corrections in the active plan/report unless edits are authorized.

Preserve hook behavior/configuration and check activation separately. Files alone do not establish trust/execution. Add a deterministic regression check where a repeated failure warrants one.

Run the documentation check from docs/VERIFICATION.md and additional checks required for script/config edits. Update the relevant active plan with evidence and next action; archive only after acceptance passes. Report changed paths, actual checks, and unresolved drift.
