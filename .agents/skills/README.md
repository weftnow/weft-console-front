# Repository procedures

These project-local Markdown procedures supplement [AGENTS.md](../../AGENTS.md), [planning](../../docs/PLANS.md), and [verification](../../docs/VERIFICATION.md). Required policy remains in those canonical references.

| Skill | Trigger | Procedure |
| --- | --- | --- |
| Harness maintenance | Demonstrated instruction, path, command, or workflow drift; explicit maintenance | [harness-maintenance/SKILL.md](harness-maintenance/SKILL.md) |
| Verification handoff | Validate or finish a change and report actual evidence | [verification-handoff/SKILL.md](verification-handoff/SKILL.md) |
| Contextual commits | User requests a commit or grouping requested work into commits | [contextual-commits/SKILL.md](contextual-commits/SKILL.md) |

If the host discovers repository skills, use its supported loading mechanism. Otherwise open the linked SKILL.md manually and follow it with AGENTS.md. No particular model, global installation, or lifecycle hook is required to read these files; automatic discovery is host-specific.

With context: “Update event import validation using its existing backend contract; follow AGENTS.md, save a plan if needed, and use verification-handoff when finished.”

Without prior context: “Read AGENTS.md and the documentation index, inspect the project, and use harness-maintenance to repair stale guidance.”

Add a specialized skill only when a repeated concrete workflow demonstrates value. Give it a precise trigger, actual project paths, bounded steps, and verification/recovery evidence. Preserve existing equivalents and avoid duplicate catalogs or dependencies on globally installed skills. Run `pnpm check:docs` after catalog changes; add required procedures to the harness manifest.
