import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const overview = readFileSync(
  new URL("../src/modules/insights/components/organizer-overview.tsx", import.meta.url),
  "utf8",
);
const sidebar = readFileSync(
  new URL("../src/shared/ui/console-sidebar.tsx", import.meta.url),
  "utf8",
);
const repeatChart = readFileSync(
  new URL("../src/modules/insights/components/repeat-attendance-chart.tsx", import.meta.url),
  "utf8",
);

test("recommendation pairs center profiles and the connector with readable card text", () => {
  assert.match(css, /\.recommendation-pair\s*\{[^}]*justify-items:\s*center/s);
  assert.match(css, /\.recommendation-person\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.recommendation-person \.network-person__image\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(css, /\.recommendation-person h3\s*\{[^}]*font-size:\s*13px/s);
  assert.match(css, /\.recommendation-reason p\s*\{[^}]*font-size:\s*10px/s);
});

test("network page scopes its warm-white inset surface without changing the shared inset", () => {
  assert.match(
    css,
    /\.network-main\s*\{[^}]*--weft-surface-inset:\s*#f7f6f3/s,
  );
  assert.match(css, /--weft-surface-inset:\s*#efede8/);
  assert.match(
    css,
    /\.recommendation-card\s*\{[^}]*background:\s*var\(--weft-surface-inset\)/s,
  );
  assert.match(
    css,
    /\.composition-donut::before\s*\{[^}]*background:\s*var\(--weft-surface-inset\)/s,
  );
  assert.match(
    css,
    /\.introduction-progress\s*\{[^}]*background:\s*var\(--weft-surface-inset\)/s,
  );
  assert.match(
    css,
    /\.return-rate > span\s*\{[^}]*background:\s*var\(--weft-surface-inset\)/s,
  );
  assert.match(
    css,
    /\.returning-table tbody\s*\{[^}]*background:\s*var\(--weft-surface-inset\)/s,
  );
});

test("network page inset shadows layer visible depth without washing out their centers", () => {
  const networkRule = css.match(/\.network-main\s*\{([^}]*)\}/s)?.[1] ?? "";
  const recipes = new Map([
    ["--weft-shadow-inset", [6, 14]],
    ["--weft-shadow-inset-deep", [10, 18]],
    ["--weft-shadow-inset-compact", [5, 11]],
    ["--weft-shadow-inset-track", [3]],
  ]);

  for (const [token, expectedBlurs] of recipes) {
    const tokenPattern = new RegExp(`${token}:([\\s\\S]*?);`);
    const value = networkRule.match(tokenPattern)?.[1] ?? "";
    const blurs = [...value.matchAll(/inset\s+0\s+0\s+(\d+)px/g)]
      .map((match) => Number(match[1]))
      .filter(Boolean);

    assert.ok(value, `${token} must be defined on the Network page`);
    assert.deepEqual(blurs, expectedBlurs, `${token} must use its calibrated depth falloff`);
    assert.match(value, /inset\s+0\s+0\s+0\s+1px/, `${token} must retain a crisp inner edge`);
  }

  assert.match(
    css,
    /\.recommendation-card\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-compact\)/s,
  );
  assert.match(
    css,
    /\.returning-table tbody\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-deep\)/s,
  );
  assert.match(
    css,
    /\.introduction-progress\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-track\)/s,
  );
  assert.match(
    css,
    /\.return-rate > span\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-inset-track\)/s,
  );
});

test("selected controls use the shared pressed depth recipe", () => {
  assert.match(css, /\.surface-pressed\s*\{[^}]*box-shadow:\s*var\(--weft-shadow-pressed\)/s);
  assert.match(sidebar, /nav-link--active surface-pressed/);
  assert.ok(css.indexOf(".nav-link.surface-pressed") > css.indexOf(".nav-link {"));
});

test("filter and selector controls stay opaque and raised", () => {
  assert.doesNotMatch(overview, /filter-trigger--selected/);
  assert.doesNotMatch(overview, /compact-select--selected/);
  assert.doesNotMatch(css, /\.filter-trigger--selected/);
  assert.doesNotMatch(css, /\.compact-select--selected/);
});

test("overview select controls align their labels and icons with a stronger label weight", () => {
  assert.match(css, /\.compact-select\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /\.compact-select\s*\{[^}]*align-items:\s*center/s);
  assert.match(css, /\.compact-select\s*\{[^}]*justify-content:\s*center/s);
  assert.match(css, /\.compact-select\s*\{[^}]*gap:\s*8px/s);
  assert.match(css, /\.compact-select\s*\{[^}]*font-size:\s*12px/s);
  assert.match(css, /\.compact-select\s*\{[^}]*font-weight:\s*600/s);
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
