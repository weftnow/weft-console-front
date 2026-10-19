import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkHarness } from "../scripts/check-harness.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "weft-harness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "scripts"));
  mkdirSync(path.join(root, "plans/active"), { recursive: true });
  const config = {
    agents: "GUIDE.md", maxAgentLines: 100, activePlans: "plans/active",
    required: ["GUIDE.md", "plans/active"], markdownRoots: ["GUIDE.md"],
  };
  const save = () => writeFileSync(path.join(root, "scripts/harness.json"), JSON.stringify(config));
  const guide = (content) => writeFileSync(path.join(root, "GUIDE.md"), content);
  save();
  guide("# Fixture\n[Plans](plans/active/)\n");
  return { root, config, save, guide };
}

test("harness accepts custom paths, external URLs, anchors, and code examples", (t) => {
  const { root, guide } = fixture(t);
  guide([
    "[Plans](plans/active/)", "[web](https://example.org/no-check)", "[mail](mailto:user@example.org)",
    "[anchor](#not-validated)", "[remote](//example.org/file)",
    "```md", "[ignored](missing)", "```", "~~~md", "[ignored](missing)", "~~~",
    "`[ignored](missing)` and ``[ignored](missing)``",
  ].join("\n"));
  assert.deepEqual(checkHarness(root), []);
});

test("harness reports missing required paths, broken links, and oversized instructions", (t) => {
  const { root, guide } = fixture(t);
  rmSync(path.join(root, "plans/active"), { recursive: true });
  guide("[broken](missing.md)\n" + "line\n".repeat(100));
  const errors = checkHarness(root);
  assert.ok(errors.some((error) => error.includes("Missing harness path")));
  assert.ok(errors.some((error) => error.includes("broken local link")));
  assert.ok(errors.some((error) => error.includes("exceeds 100 lines")));
});

test("harness handles encoded/angle links, images, and reference definitions", (t) => {
  const { root, guide } = fixture(t);
  writeFileSync(path.join(root, "a b.md"), "# File\n");
  guide("[a](<a b.md>)\n[b](a%20b.md#heading)\n[c](a%20b.md?view=1)\n![image](missing.png)\n[ref]: missing.md\n");
  const errors = checkHarness(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.includes("missing.png")));
  assert.ok(errors.some((error) => error.includes("missing.md")));
});

test("harness rejects malformed and escaping configuration", (t) => {
  const { root, config, save } = fixture(t);
  for (const [key, value] of [
    ["markdownRoots", ["../outside"]], ["required", "GUIDE.md"],
    ["agents", "/absolute.md"], ["maxAgentLines", "100"], ["maxAgentLines", 0],
  ]) {
    const original = config[key];
    config[key] = value;
    save();
    assert.ok(checkHarness(root).length, key);
    config[key] = original;
  }
  writeFileSync(path.join(root, "scripts/harness.json"), "{invalid");
  assert.ok(checkHarness(root)[0].startsWith("Harness check could not finish:"));
});

test("harness rejects missing metadata paths and non-directory active plans", (t) => {
  const { root, config, save } = fixture(t);
  config.agents = "missing.md";
  save();
  assert.ok(checkHarness(root).some((error) => error.includes("missing.md")));
  config.agents = "GUIDE.md";
  config.activePlans = "GUIDE.md";
  save();
  assert.ok(checkHarness(root).includes("activePlans must be a directory"));
});

test("harness does not traverse symlinks and rejects links escaping the repository", (t) => {
  const { root, config, save, guide } = fixture(t);
  symlinkSync(root, path.join(root, "loop"), "dir");
  config.markdownRoots = ["."];
  save();
  assert.deepEqual(checkHarness(root), []);
  symlinkSync(os.tmpdir(), path.join(root, "outside"), "dir");
  guide("[escape](../outside.md)\n[symlink](outside/missing-file.md)\n[invalid](bad%ZZ.md)\n");
  assert.equal(checkHarness(root).length, 3);
});

test("harness CLI resolves its installed root from another cwd and propagates failure", (t) => {
  const { root, guide } = fixture(t);
  const script = path.join(root, "scripts/check-harness.mjs");
  copyFileSync(fileURLToPath(new URL("../scripts/check-harness.mjs", import.meta.url)), script);
  const run = () => spawnSync(process.execPath, [script], { cwd: os.tmpdir(), encoding: "utf8" });
  const success = run();
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /checks passed/);
  guide("[broken](missing.md)\n");
  const failure = run();
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /broken local link/);
});
