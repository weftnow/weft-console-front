# Execution plans

Use a saved plan for nontrivial, risky, cross-boundary, or multi-session work. A small clear fix may use a conversational plan. Inspect [active plans](exec-plans/active/) before starting; resume relevant work instead of creating competing plans.

Create `docs/exec-plans/active/YYYY-MM-DD-short-name.md` before implementation. Include observable acceptance, affected roles/tenants, constraints, verification, and a next action. Requirements come from user instructions and accepted references; label unreviewed proposals and unknowns. For unresolved behavior, first create a [change specification](changes/README.md).

Update the plan after material steps and decisions, and before handoff. Record commands and actual results, including skipped tests and prerequisite failures. An unchecked acceptance criterion keeps the plan active. Do not infer success from code presence, a historical checkbox, or a working-tree hook.

After all acceptance criteria pass, set Status to Complete and move the file to `docs/exec-plans/completed/` with the same name. Repair incoming and relative links, update linked specification status, and record concrete nonblocking follow-ups in the [debt tracker](exec-plans/tech-debt-tracker.md). Historical completed plans explain previous work; current canonical docs define current behavior.

## Template

```markdown
# Change title

Status: Active
Owner: person or current agent
Created: YYYY-MM-DD

## Goal and acceptance criteria
Observable behavior, scope/non-goals, affected organizations/roles, and unresolved proposals.

## Context
Baseline, real paths, constraints, dependencies, and optional spec link.

## Steps and progress
- [ ] Establish baseline and resolve material decisions.
- [ ] Implement the smallest coherent change.
- [ ] Verify acceptance and update affected docs.

## Decisions and discoveries
Dated decisions with evidence, reasons, and deviations.

## Verification
Actual commands, scenarios, results, blockers, and outstanding checks.

## Handoff or outcome
Next concrete action while active; final behavior and limitations when complete.
```

## Imported history

Older plans are in [legacy](exec-plans/legacy/README.md), separate from active and verified completed work. Their content is preserved, but old tool execution requirements have been replaced with this workflow. Some describe implemented work while leaving all tasks unchecked; others record missing database/browser acceptance or baseline test failures.

Before resuming a legacy item, reconcile user intent, code, tests, current docs, and outstanding acceptance. Create a current active plan linking the historical source, or document evidence before moving it to completed. Migration itself never certifies completion or authorizes live operations.
