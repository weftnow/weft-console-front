import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { validateMigrationEnvironment } from "./migrate.mjs";

export function runVercelBuild(env = process.env, run = spawnSync) {
  const onVercel = env.VERCEL === "1";
  if (onVercel) validateMigrationEnvironment(env);
  const build = run("pnpm", ["build"], { stdio: "inherit", env });
  if (build.status !== 0) return build.status ?? 1;
  if (!onVercel) return 0;
  const migration = run("pnpm", ["db:migrate"], { stdio: "inherit", env });
  return migration.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runVercelBuild();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
