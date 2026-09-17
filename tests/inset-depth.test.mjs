import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const overview = readFileSync(
  new URL("../modules/insights/components/organizer-overview.tsx", import.meta.url),
  "utf8",
);
const repeatChart = readFileSync(
  new URL("../modules/insights/components/repeat-attendance-chart.tsx", import.meta.url),
  "utf8",
);

test("selected controls use the shared pressed depth recipe", () => {
  assert.match(css, /\.surface-pressed\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-pressed\)/s);
  assert.match(overview, /nav-link--active surface-pressed/);
  assert.ok(css.indexOf(".nav-link.surface-pressed") > css.indexOf(".nav-link {"));
});

test("filter and selector controls stay opaque and raised", () => {
  assert.doesNotMatch(overview, /filter-trigger--selected/);
  assert.doesNotMatch(overview, /compact-select--selected/);
  assert.doesNotMatch(css, /\.filter-trigger--selected/);
  assert.doesNotMatch(css, /\.compact-select--selected/);
});

test("contained analytics surfaces use inset depth without raising decorative icons", () => {
  assert.match(overview, /className="metric__icon" depth="inset"/);
  assert.match(overview, /<tbody className="table-body-well" data-depth="inset">/);
  assert.match(css, /\.progress-track\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-compact\)/s);
  assert.match(css, /\.radial-track\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-compact\)/s);
});

test("repeat attendance chart renders its track as a separate recessed surface", () => {
  assert.match(repeatChart, /className="radial-track"/);
  assert.match(repeatChart, /background=\{\{ fill: "transparent" \}\}/);
});

test("inset surfaces read as matte ceramic cuts rather than glossy overlays", () => {
  assert.match(css, /--weft-surface-inset:\s*#efede8/);
  assert.match(
    css,
    /--weft-shadow-inset:\s*inset 7px 7px 16px rgba\(86, 74, 60, 0\.18\),\s*inset -7px -7px 16px rgba\(255, 255, 255, 0\.3\)/s,
  );
  assert.match(
    css,
    /--weft-shadow-inset-deep:\s*inset 12px 12px 28px rgba\(86, 74, 60, 0\.18\),\s*inset -12px -12px 28px rgba\(255, 255, 255, 0\.3\)/s,
  );
  assert.match(
    css,
    /\.surface-inset\s*\{[^}]*border-color:\s*transparent/s,
  );
});

test("large wells and compact details scale the shared inset lighting", () => {
  assert.match(
    css,
    /\.chart-well\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-deep\)/s,
  );
  assert.match(
    css,
    /\.event-table tbody\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-deep\)/s,
  );
  assert.match(
    css,
    /\.metric__icon\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-compact\)/s,
  );
  assert.match(
    css,
    /\.progress-track\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-compact\)/s,
  );
});
