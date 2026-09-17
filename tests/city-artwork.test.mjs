import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadCityArtwork() {
  const source = readFileSync(
    new URL("../src/shared/ui/city-artwork.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const evaluate = new Function("module", "exports", "require", compiled);
  evaluate(loadedModule, loadedModule.exports, require);
  return loadedModule.exports.CityArtwork;
}

test("city artwork renders a responsive decorative image without hiding overlays", () => {
  const CityArtwork = loadCityArtwork();
  const markup = renderToStaticMarkup(
    React.createElement(
      CityArtwork,
      {
        art: {
          horizon: "#f0842c",
          image: "/las_vegas.png",
          sky: "#3b3053",
        },
        className: "city-art--cinematic",
        eager: true,
      },
      React.createElement("span", { className: "live-badge" }, "Live"),
    ),
  );

  assert.match(markup, /<img[^>]+alt=""/);
  assert.match(markup, /las_vegas\.png/);
  assert.match(markup, /sizes="[^"]*100vw[^"]*"/);
  assert.match(markup, /class="city-art__image"/);
  assert.match(markup, /loading="eager"/);
  assert.match(markup, /<span class="live-badge">Live<\/span>/);
});
