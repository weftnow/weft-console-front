import { randomUUID } from "node:crypto";
import { Pool } from "pg";

type Options = {
  instanceId: string; clerkUserId: string; localUserId?: string;
  displayName?: string; avatarUrl?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clerkIdPattern = /^user_[A-Za-z0-9]{8,}$/;

export function parseArgs(args: string[]): Options {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--") || values.has(key) || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error("Invalid provisioning arguments.");
    }
    values.set(key, args[++index]);
  }
  const instanceId = values.get("--instance-id");
  const clerkUserId = values.get("--clerk-user-id");
  const localUserId = values.get("--local-user-id");
  const displayName = values.get("--display-name");
  const avatarUrl = values.get("--avatar-url");
  if (!instanceId || !clerkUserId || Boolean(localUserId) === Boolean(displayName)) throw new Error("Specify an instance, Clerk user, and exactly one local user or display name.");
  if ([...values.keys()].some((key) => !["--instance-id", "--clerk-user-id", "--local-user-id", "--display-name", "--avatar-url"].includes(key))) throw new Error("Unsupported provisioning argument.");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(instanceId) || !clerkIdPattern.test(clerkUserId)) throw new Error("Invalid Clerk identity format.");
  if (localUserId && !uuidPattern.test(localUserId)) throw new Error("Invalid local user UUID.");
  if (displayName && (!displayName.trim() || displayName.trim().length > 160)) throw new Error("Display name must contain 1 to 160 characters.");
  if (avatarUrl && (avatarUrl.length > 2048 || !/^https:\/\//i.test(avatarUrl))) throw new Error("Avatar URL must use HTTPS.");
  return { instanceId, clerkUserId, ...(localUserId ? { localUserId } : { displayName }), ...(avatarUrl ? { avatarUrl } : {}) };
}

async function provision(options: Options): Promise<{ localUserId: string; outcome: "created" | "linked" | "already_mapped" }> {
  if (!(["development", "test"] as const).includes(process.env.WEFT_PROVISION_TARGET as "development" | "test")) {
    throw new Error("Set WEFT_PROVISION_TARGET=development or test.");
  }
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  if (!connectionString) throw new Error("DATABASE_MIGRATION_URL is required.");
  const url = new URL(connectionString);
  if (!/^weft_console_test$/.test(url.pathname.slice(1)) || !url.hostname.endsWith("neon.tech")) {
    throw new Error("Provisioning is restricted to the dev/test weft_console_test Neon database.");
  }
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", [options.instanceId, options.clerkUserId]);
    const [existingMapping] = (await client.query<{ user_id: string; disabled_at: Date | null }>(
      "SELECT user_id, disabled_at FROM user_auth_identities WHERE provider = 'clerk' AND instance_id = $1 AND subject = $2 FOR UPDATE",
      [options.instanceId, options.clerkUserId],
    )).rows;
    if (existingMapping) {
      if (options.localUserId && existingMapping.user_id !== options.localUserId) throw new Error("Clerk identity is already linked to another local user.");
      if (existingMapping.disabled_at) throw new Error("Clerk identity mapping is disabled and requires administrative review.");
      await client.query("COMMIT");
      return { localUserId: existingMapping.user_id, outcome: "already_mapped" };
    }

    let localUserId: string;
    let outcome: "created" | "linked";
    if (options.localUserId) {
      const found = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [options.localUserId]);
      if (!found.rowCount) throw new Error("Local user does not exist.");
      localUserId = options.localUserId;
      outcome = "linked";
    } else {
      localUserId = randomUUID();
      await client.query("INSERT INTO users (id, display_name, avatar_url) VALUES ($1, $2, $3)", [localUserId, options.displayName, options.avatarUrl ?? null]);
      outcome = "created";
    }
    await client.query(
      "INSERT INTO user_auth_identities (user_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)",
      [localUserId, options.instanceId, options.clerkUserId],
    );
    await client.query("COMMIT");
    return { localUserId, outcome };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  try {
    const result = await provision(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${result.outcome}: ${result.localUserId}\n`);
  } catch {
    process.stderr.write("Provisioning failed; verify arguments, target and identity conflicts.\n");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("provision-clerk-user.ts")) void main();
