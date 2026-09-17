import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

const moduleCache = new Map();

/**
 * Transpile and evaluate a TypeScript source file. Relative imports are
 * resolved against the importing file rather than this test, so a module that
 * pulls in a sibling (event-record -> seed-guests) loads the real thing.
 */
function loadModule(path, base = import.meta.url) {
  const url = new URL(path, base);
  const resolved = ["", ".ts", ".tsx", "/index.ts"]
    .map((extension) => new URL(url.href + extension))
    .find((candidate) => existsSync(candidate));

  if (!resolved) return require(path);
  if (moduleCache.has(resolved.href)) return moduleCache.get(resolved.href);

  const compiled = ts.transpileModule(readFileSync(resolved, "utf8"), {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const loadedModule = { exports: {} };
  moduleCache.set(resolved.href, loadedModule.exports);
  const scopedRequire = (request) =>
    request.startsWith(".") ? loadModule(request, resolved.href) : require(request);
  const evaluate = new Function("module", "exports", "require", compiled);
  evaluate(loadedModule, loadedModule.exports, scopedRequire);
  moduleCache.set(resolved.href, loadedModule.exports);
  return loadedModule.exports;
}

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
  function ImageMock(props) {
    return React.createElement("img", props);
  }
  ImageMock.displayName = "ImageMock";
  const localRequire = (specifier) => {
    if (specifier === "next/image") return ImageMock;
    return require(specifier);
  };
  evaluate(loadedModule, loadedModule.exports, localRequire);
  return loadedModule.exports.CityArtwork;
}

function eventWithEstimate(expectedAttendees) {
  return {
    attendees: { guests: [], imported: null },
    categories: [],
    city: "Las Vegas, USA",
    coverImage: null,
    createdAt: "2026-09-17T00:00:00.000Z",
    description: "",
    endDate: "2026-11-22",
    endTime: "",
    expectedAttendees,
    expectedAudience: [],
    id: "new-event",
    name: "New event",
    staff: [],
    startDate: "2026-11-19",
    startTime: "",
    updatedAt: "2026-09-17T00:00:00.000Z",
    venue: "",
  };
}

test("an attendee estimate does not become an attendee metric without records", () => {
  const { deriveEventMetrics } = loadModule("../src/modules/events/event-record.ts");

  assert.deepEqual(deriveEventMetrics(eventWithEstimate(200)), {
    attendees: 0,
    attendeesAreExpected: false,
    sponsors: 0,
    staff: 0,
    vips: 0,
  });
});

test("the new-event cover placeholder renders without a Las Vegas image", () => {
  const { EVENT_COVER_PLACEHOLDER_ART } = loadModule("../src/modules/events/event-record.ts");
  assert.ok(EVENT_COVER_PLACEHOLDER_ART, "the event cover placeholder must be defined");
  const CityArtwork = loadCityArtwork();
  const markup = renderToStaticMarkup(
    React.createElement(CityArtwork, { art: EVENT_COVER_PLACEHOLDER_ART }),
  );

  assert.doesNotMatch(markup, /las_vegas\.png/);
  assert.doesNotMatch(markup, /<img/);
});
