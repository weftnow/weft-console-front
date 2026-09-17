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
  assert.match(css, /\.recommendation-reason p\s*\{[^}]*font-size:\s*11px/s);
});

test("every page shares the single root inset surface and shadow tokens", () => {
  assert.match(css, /:root\s*\{[^}]*--weft-surface-inset:\s*#f3f1ec/s);
  assert.doesNotMatch(css, /\.(network-main|people-main|person-panel|partner-main)\s*\{[^}]*--weft-surface-inset:/s);
  assert.doesNotMatch(css, /\.(network-main|people-main|person-panel|partner-main)\s*\{[^}]*--weft-shadow-inset[a-z-]*:/s);
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

test("inset shadows are non-directional ceramic cuts: crisp edge, soft even shade, no light source", () => {
  const rootRule = css.match(/:root\s*\{([^}]*)\}/s)?.[1] ?? "";
  const tokens = [
    "--weft-shadow-inset",
    "--weft-shadow-inset-deep",
    "--weft-shadow-inset-compact",
    "--weft-shadow-inset-track",
    "--weft-shadow-pressed",
  ];

  for (const token of tokens) {
    const value = rootRule.match(new RegExp(`${token}:([\\s\\S]*?);`))?.[1] ?? "";
    assert.ok(value, `${token} must be defined at :root`);
    const layers = value.split(",\n").map((layer) => layer.trim());
    for (const layer of layers) {
      assert.match(layer, /^(inset )?0 0 /, `${token} must not offset any layer (no simulated light): ${layer}`);
      const isOuterRim = /^0 0 .*255,\s*255,\s*255/.test(layer);
      if (isOuterRim) continue;
      assert.match(layer, /^inset /, `${token} may only paint outside the cut with the white rim: ${layer}`);
      const alpha = Number(layer.match(/rgba\([^)]*,\s*([\d.]+)\)/)?.[1]);
      assert.ok(alpha <= 0.24, `${token} shade must stay below .24, got ${alpha}`);
    }
    assert.match(value, /inset\s+0\s+0\s+0\s+1px/, `${token} must retain a faint inner edge`);
    assert.doesNotMatch(value, /inset[^,]*255,\s*255,\s*255/, `${token} must not paint an inner highlight`);
    assert.match(value, /\n\s*0 0 0 1px rgba\(255, 255, 255/, `${token} must carry the outer white rim`);
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
  assert.match(css, /--weft-surface-inset:\s*#f3f1ec/);
  assert.match(
    css,
    /--weft-shadow-inset:\s*inset 0 0 4px rgba\(86, 74, 60, 0\.22\),\s*inset 0 0 16px rgba\(86, 74, 60, 0\.12\),\s*inset 0 0 0 1px rgba\(87, 78, 67, 0\.06\)/s,
  );
  assert.match(
    css,
    /--weft-shadow-inset-deep:\s*inset 0 0 5px rgba\(86, 74, 60, 0\.22\),\s*inset 0 0 26px rgba\(86, 74, 60, 0\.13\),\s*inset 0 0 0 1px rgba\(87, 78, 67, 0\.06\)/s,
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

test("type scale keeps a 10px floor and same-role labels share one size", () => {
  const sizes = [...css.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0);
  assert.ok(Math.min(...sizes) >= 10, `smallest font-size is ${Math.min(...sizes)}px`);
  const metricLabels = [
    /\.metric__label\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.event-detail-metric div > span\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.live-metric__label\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.network-metric small\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.people-metric__copy span\s*\{[^}]*font-size:\s*(\d+)px/s,
  ].map((pattern) => css.match(pattern)?.[1]);
  assert.deepEqual(metricLabels, ["12", "12", "12", "12", "12"]);
  const tableHeads = [
    /\.event-table th\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.people-table th\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.partner-table th\s*\{[^}]*font-size:\s*(\d+)px/s,
    /\.returning-table th\s*\{[^}]*font-size:\s*(\d+)px/s,
  ].map((pattern) => css.match(pattern)?.[1]);
  assert.deepEqual(tableHeads, ["11", "11", "11", "11"]);
});
