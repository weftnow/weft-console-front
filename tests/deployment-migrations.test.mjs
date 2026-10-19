import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { validateMigrationEnvironment, runMigrations } from "../scripts/migrate.mjs";
import { runVercelBuild } from "../scripts/vercel-build.mjs";

const production = {
  VERCEL: "1", VERCEL_ENV: "production", WEFT_MIGRATION_TARGET: "production",
  DATABASE_MIGRATION_URL: "postgresql://operator:secret@ep-prod.neon.tech/weft_console?sslmode=require",
  DATABASE_URL: "postgresql://app:secret@ep-prod-pooler.neon.tech/weft_console?sslmode=require",
};
const preview = {
  ...production, VERCEL_ENV: "preview", WEFT_MIGRATION_TARGET: "development",
  DATABASE_MIGRATION_URL: "postgresql://operator:secret@ep-dev.neon.tech/weft_console_test?sslmode=require",
  DATABASE_URL: "postgresql://app:secret@ep-dev-pooler.neon.tech/weft_console_test?sslmode=require",
};

test("Vercel invokes the migration-aware build while ordinary builds remain unchanged", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(config.buildCommand, "pnpm build:vercel");
  assert.equal(pkg.scripts["build:vercel"], "node scripts/vercel-build.mjs");
  assert.equal(pkg.scripts.build, "next build");
});

test("production and preview accept their matching direct migration and pooled runtime targets", () => {
  assert.equal(validateMigrationEnvironment(production).database, "weft_console");
  assert.equal(validateMigrationEnvironment(preview).database, "weft_console_test");
  assert.equal(validateMigrationEnvironment({ WEFT_MIGRATION_TARGET: "test", DATABASE_MIGRATION_URL: "postgresql://localhost/scratch" }).database, "scratch");
});

test("migration validation rejects unsafe or mismatched deployment targets without disclosing credentials", () => {
  for (const env of [
    { ...production, WEFT_MIGRATION_TARGET: "development" },
    { ...preview, WEFT_MIGRATION_TARGET: "production" },
    { ...production, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL.replace("weft_console?", "weft?") },
    { ...preview, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL },
    { ...production, DATABASE_URL: preview.DATABASE_URL },
    { ...production, DATABASE_URL: "" },
    { ...production, DATABASE_MIGRATION_URL: production.DATABASE_URL },
    { ...production, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL.replace("require", "disable") },
    { ...production, DATABASE_MIGRATION_URL: "not-a-url-secret" },
    { ...production, DATABASE_MIGRATION_URL: "" },
    { ...production, VERCEL_ENV: "staging" },
    { ...production, DATABASE_MIGRATION_URL: "postgresql://localhost/weft_console" },
    { ...production, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL.replace("?sslmode=require", "") },
    ...["host=ep-other.neon.tech", "ssl=0", "port=9999", "database=weft", "uselibpqcompat=true"].map((override) => ({
      ...production, DATABASE_MIGRATION_URL: `${production.DATABASE_MIGRATION_URL}&${override}`,
    })),
    { ...production, DATABASE_URL: `${production.DATABASE_URL}&host=ep-other.neon.tech` },
  ]) {
    assert.throws(() => validateMigrationEnvironment(env), (error) => !error.message.includes("secret"));
  }
});

test("Vercel builds first, migrates only after success, and propagates failures", () => {
  for (const [statuses, expected, commandCount] of [[[0, 0], 0, 2], [[7], 7, 1], [[0, 9], 9, 2]]) {
    const calls = [];
    const status = runVercelBuild(production, (command, args) => {
      calls.push([command, args]);
      return { status: statuses[calls.length - 1] };
    });
    assert.equal(status, expected);
    assert.equal(calls.length, commandCount);
    assert.deepEqual(calls[0], ["pnpm", ["build"]]);
    if (calls.length === 2) assert.deepEqual(calls[1], ["pnpm", ["db:migrate"]]);
  }
});

test("invalid Vercel configuration fails before building; local builds never migrate", () => {
  assert.throws(() => runVercelBuild({ ...preview, DATABASE_MIGRATION_URL: production.DATABASE_MIGRATION_URL }, () => assert.fail("must not build")));
  let calls = 0;
  assert.equal(runVercelBuild({}, () => { calls++; return { status: 0 }; }), 0);
  assert.equal(calls, 1);
  assert.equal(runVercelBuild({}, () => ({ status: null })), 1);
});

test("migrations hold a session lock and close the connection on success or failure", async () => {
  for (const failAt of [null, "connect", "lock", "migrate"]) {
    const calls = [];
    const client = {
      connect: async () => {
        calls.push("connect");
        if (failAt === "connect") throw new Error("connection failure");
      },
      query: async (sql) => {
        if (sql.includes("pg_advisory_lock")) {
          calls.push("lock");
          if (failAt === "lock") throw new Error("lock timeout");
        }
      },
      end: async () => calls.push("end"),
    };
    const operation = runMigrations(production, {
      createClient: (options) => {
        assert.deepEqual(options.ssl, { rejectUnauthorized: true });
        assert.equal(new URL(options.connectionString).searchParams.has("sslmode"), false);
        const effective = new Client(options).connectionParameters;
        assert.equal(effective.host, "ep-prod.neon.tech");
        assert.equal(effective.database, "weft_console");
        assert.deepEqual(effective.ssl, { rejectUnauthorized: true });
        return client;
      },
      applyMigrations: async (connection) => {
        assert.equal(connection, client);
        calls.push("migrate");
        if (failAt === "migrate") throw new Error("SQL failure");
      },
    });
    if (failAt) await assert.rejects(operation);
    else await operation;
    assert.deepEqual(calls, failAt === "connect" ? ["connect", "end"] : failAt === "lock" ? ["connect", "lock", "end"] : ["connect", "lock", "migrate", "end"]);
  }
});
