import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

test("unconfigured authentication never creates an actor", async () => {
  const path = new URL("../src/infrastructure/auth/current-user.ts", import.meta.url);
  assert.ok(existsSync(path), "the server auth boundary must exist");
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("module", "exports", "require", compiled)(loadedModule, loadedModule.exports, (name) =>
    name === "server-only" ? {} : require(name),
  );
  assert.equal(await loadedModule.exports.getCurrentUser(), null);
});
