---
name: contextual-commits
description: Commit requested repository changes in coherent groups with Conventional Commit messages. Use when asked to commit work or organize pending changes into commits.
---

# Contextual commits

For Weft, read [AGENTS.md](../../../AGENTS.md), [Verification](../../../docs/VERIFICATION.md), and the relevant [active plan](../../../docs/exec-plans/active/). The prepared hooks check the working tree, not a partial staged revision. Use existing pnpm commands and preserve unrelated work. Loading this procedure alone does not request a commit.

Read AGENTS.md, docs/VERIFICATION.md, and the relevant active plan. Inspect status, staged/unstaged diffs, untracked files, and recent subjects. Establish requested scope; preserve unrelated work and pre-existing staged content.

Group by independent intent or boundary. Keep tests with behavior and lockfiles with dependencies. Do not split solely by file type or combine unrelated work from one directory. For several commits, identify each subject and exact path set before staging.

Stage only intended paths/hunks. Avoid broad staging in a mixed tree. Isolate unrelated staged content without discarding or silently unstaging it. Inspect full staged diff, whitespace check, and stat; exclude secrets/generated output.

Run repository-required verification for the final implementation and focused checks for intermediate snapshots when warranted. Avoid repeated full suites without reason. Working-tree hooks do not prove partial staged commits; inspect snapshots and check exact revisions when needed. Do not bypass failures.

Use `type(scope): imperative summary`; omit unhelpful scope. Add a body for meaningful reasons/tradeoffs and a breaking-change notice for incompatibility. Commit, inspect contents/remaining status, then continue. Do not push or rewrite shared history unless requested.

Report hashes/subjects, actual verification, and requested work left uncommitted with reasons.
