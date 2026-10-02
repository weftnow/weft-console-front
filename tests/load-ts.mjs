import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
const root = pathToFileURL(`${process.cwd()}/`);

export function loadTs(path, base = root) {
  const url = path.startsWith("@/")
    ? new URL(`src/${path.slice(2)}`, root)
    : new URL(path, base);
  const found = ["", ".ts", ".tsx", "/index.ts"]
    .map((extension) => new URL(url.href + extension))
    .find((candidate) => existsSync(candidate));
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
