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

test("demo assets are gone from public/", () => {
  for (const path of ["public/samples", "public/network", "public/las_vegas.png", "public/map.png", "public/vercel.svg"]) {
    assert.equal(existsSync(path), false, `${path} should be removed`);
  }
});
