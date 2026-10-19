# Git hooks and mechanical feedback

The portable harness has two prepared executable Git hooks. No hook manager, active custom hook, or local `core.hooksPath` was found during setup. Activation is a separate per-checkout action; files alone do not mean Git runs them.

On 2026-10-17, the user requested activation in this checkout. Local `core.hooksPath` is now `.githooks`; Git resolves both hook paths to the executable scripts below. New checkouts still require their own activation.

| File | Command and scope |
| --- | --- |
| [pre-commit](../.githooks/pre-commit) | `pnpm verify:fast`: documentation, lint, typecheck |
| [pre-push](../.githooks/pre-push) | `pnpm verify`, then `pnpm build`: includes tests and the local production build |

Both use POSIX sh, `set -eu`, change to the Git root, and propagate failures. They do not stage, stash, commit, rewrite source, send invitations, or apply migrations. Typecheck/build can produce their usual ignored artifacts. Pre-push checks every invocation, including deletion-only pushes; there is no ref-based skip policy.

Node, pnpm, installed project dependencies, Git, and a POSIX shell are prerequisites. Fast checks should finish within normal lint/typecheck time; the full suite/build takes longer and may require build environment/network access. There is no artificial timeout or automatic retry loop. A hung process can be interrupted; diagnose the underlying command separately before retrying.

## Activation and coexistence

First inspect the effective configuration, including inherited values:

```bash
git config --show-origin --get core.hooksPath
```

If there is no existing hook setup and activation is desired:

```bash
git config --local core.hooksPath .githooks
```

Do not replace an existing manager or custom path silently. Integrate these commands into that setup or document the conflict. Do not change global Git configuration. To disable this installation, first confirm `git config --local --get core.hooksPath` still returns `.githooks`, then run:

```bash
git config --local --unset core.hooksPath
```

This restores Git's prior/default path behavior. Keep any pre-existing hooks and configuration intact. If executable permissions are lost, restore only these two scripts with `chmod +x .githooks/pre-commit .githooks/pre-push`.

## Failure recovery and evidence

Run the reported command directly, fix a scoped failure, and rerun relevant checks. An unrelated existing failure should be recorded and addressed explicitly; do not weaken checks or configure a silent bypass. A failed build may reflect missing configuration/network prerequisites; see [verification](VERIFICATION.md).

`pnpm test:harness` executes both scripts against temporary stubbed Git/pnpm commands. It checks root selection, success, fast/full ordering, propagation of verification/build failures, and that a failed full check prevents build. The checker fixtures separately exercise valid/broken documentation and the installed CLI. Stubs prove dispatch and failure handling; actual commands need the separate verification results.

Hooks inspect the working tree. They do not establish the exact partially staged commit or remote revision. Inspect staged contents when committing and run verification against the actual checked-out revision in CI. These hooks are not agent lifecycle automation; all checks remain directly invokable through package scripts.
