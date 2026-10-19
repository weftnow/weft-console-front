import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "weft-hooks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  mkdirSync(path.join(root, "nested"));
  const log = path.join(root, "calls.log");
  writeFileSync(path.join(bin, "git"), '#!/bin/sh\nset -eu\ntest "$*" = "rev-parse --show-toplevel"\nprintf "%s\\n" "$WEFT_HOOK_TEST_ROOT"\n');
  writeFileSync(path.join(bin, "pnpm"), '#!/bin/sh\nset -eu\nprintf "%s|%s\\n" "$PWD" "$*" >> "$WEFT_HOOK_TEST_LOG"\nif [ "$*" = "$WEFT_HOOK_TEST_FAIL" ]; then exit 37; fi\n');
  chmodSync(path.join(bin, "git"), 0o755);
  chmodSync(path.join(bin, "pnpm"), 0o755);
  const run = (hook, fail = "") => spawnSync(fileURLToPath(new URL(`../.githooks/${hook}`, import.meta.url)), [], {
    cwd: path.join(root, "nested"), encoding: "utf8", input: "",
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, WEFT_HOOK_TEST_ROOT: root, WEFT_HOOK_TEST_LOG: log, WEFT_HOOK_TEST_FAIL: fail },
  });
  const calls = () => readFileSync(log, "utf8").trim().split("\n");
  return { root, run, calls };
}

test("pre-commit runs fast verification from the Git root", (t) => {
  const { root, run, calls } = fixture(t);
  const result = run("pre-commit");
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.deepEqual(calls(), [`${root}|verify:fast`]);
});

test("pre-commit propagates verification failures", (t) => {
  const { run } = fixture(t);
  assert.equal(run("pre-commit", "verify:fast").status, 37);
});

test("pre-push runs verification and build from the Git root", (t) => {
  const { root, run, calls } = fixture(t);
  assert.equal(run("pre-push").status, 0);
  assert.deepEqual(calls(), [`${root}|verify`, `${root}|build`]);
});

test("pre-push stops on verification failure before attempting the build", (t) => {
  const { root, run, calls } = fixture(t);
  assert.equal(run("pre-push", "verify").status, 37);
  assert.deepEqual(calls(), [`${root}|verify`]);
});

test("pre-push propagates build failures", (t) => {
  const { run } = fixture(t);
  assert.equal(run("pre-push", "build").status, 37);
});
