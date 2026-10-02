import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
const root = pathToFileURL(`${process.cwd()}/`);

function resolveTs(path, base) {
  const url = path.startsWith("@/")
    ? new URL(`src/${path.slice(2)}`, root)
    : new URL(path, base);
  return ["", ".ts", ".tsx", "/index.ts"]
    .map((extension) => new URL(url.href + extension))
    .find((candidate) => existsSync(candidate));
}

/** Replace a source module with test exports, e.g. client-only Clerk controls. */
export function stubTs(path, exports) {
  const found = resolveTs(path, root);
  if (!found) throw new Error(`Cannot stub missing module ${path}`);
  cache.set(found.href, exports);
}

export function loadTs(path, base = root) {
  const found = resolveTs(path, base);
  if (!found) return require(path);
  if (cache.has(found.href)) return cache.get(found.href);
  const compiled = ts.transpileModule(readFileSync(found, "utf8"), {
    fileName: found.pathname,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  cache.set(found.href, loadedModule.exports);
  const localRequire = (specifier) =>
    specifier === "server-only" ? {} :
    specifier.startsWith(".") || specifier.startsWith("@/") ? loadTs(specifier, found) : require(specifier);
  new Function("module", "exports", "require", compiled)(loadedModule, loadedModule.exports, localRequire);
  cache.set(found.href, loadedModule.exports);
  return loadedModule.exports;
}
