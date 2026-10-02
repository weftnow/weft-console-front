import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

test("no source file contains demo data or demo branding", () => {
  const banned = /overview-data|events-data|people-data|network-data|partner-report-data|seed-guests|\/network\/avatars|las_vegas\.png|map\.png|WE ARE ONE|We Are One|Horizon Family Office|Sarah Chen|Nick Baci/;
  const offenders = files("src").filter((path) => /\.(tsx?|css)$/.test(path) && banned.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});

test("public/ ships no files (demo assets stay gone)", () => {
  const shipped = existsSync("public") ? files("public").filter((path) => !path.split("/").pop().startsWith(".")) : [];
  assert.deepEqual(shipped, []);
});

test("source never references deleted demo images", () => {
  const images = /\/(las_vegas|singapore|davos|miami|monaco|bitcoin_tech_week|map)\.png|\/network\/avatars|\/samples\//;
  const offenders = files("src").filter((path) => /\.(tsx?|css|json)$/.test(path) && images.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});
