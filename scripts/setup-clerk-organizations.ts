import { clerkClient } from "@clerk/nextjs/server";
import { Pool } from "pg";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ProviderOrganization = { id: string; name: string; publicMetadata?: Record<string, unknown> | null };
type SetupDependencies = {
  localOrganizations(ids: string[]): Promise<Array<{ id: string; name: string }>>;
  findOrganizationIdentity(organizationId: string, instanceId: string): Promise<{ organizationSubject: string } | null>;
  saveOrganizationIdentity(input: { organizationId: string; instanceId: string; organizationSubject: string }): Promise<void>;
  provider: {
    listOrganizations(): Promise<ProviderOrganization[]>;
    createOrganization(input: { name: string; publicMetadata: Record<string, unknown> }): Promise<ProviderOrganization>;
  };
};

let migrationPool: Pool | undefined;

function getMigrationPool() {
  if (!(process.env.WEFT_PROVISION_TARGET === "development" || process.env.WEFT_PROVISION_TARGET === "test")) {
    throw new Error("Set WEFT_PROVISION_TARGET=development or test.");
  }
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  if (!connectionString) throw new Error("DATABASE_MIGRATION_URL is required.");
  const url = new URL(connectionString);
  if (url.pathname.slice(1) !== "weft_console_test" || !url.hostname.endsWith("neon.tech")) {
    throw new Error("Setup is restricted to Neon weft_console_test.");
  }
  migrationPool ??= new Pool({ connectionString, ssl: { rejectUnauthorized: true }, max: 1 });
  return migrationPool;
}

function providerOrganizations(getClient: () => Promise<Awaited<ReturnType<typeof clerkClient>>>) {
  return {
    async listOrganizations(): Promise<ProviderOrganization[]> {
      const all: ProviderOrganization[] = [];
      let offset = 0;
      let total = Number.POSITIVE_INFINITY;
      while (offset < total) {
        const client = await getClient();
        const page = await client.organizations.getOrganizationList({ limit: 100, offset });
        all.push(...page.data);
        total = page.totalCount;
        if (page.data.length === 0) break;
        offset += 100;
      }
      return all;
    },
    async createOrganization(input: { name: string; publicMetadata: Record<string, unknown> }): Promise<ProviderOrganization> {
      const client = await getClient();
      const org = await client.organizations.createOrganization(input);
      return { id: org.id, name: org.name, publicMetadata: org.publicMetadata };
    },
  };
}

const defaults: SetupDependencies = {
  localOrganizations: async (ids) => (await getMigrationPool().query<{ id: string; name: string }>(
    "SELECT id, name FROM organizations WHERE id = ANY($1::uuid[])", [ids],
  )).rows,
  findOrganizationIdentity: async (organizationId, instanceId) => {
    const result = await getMigrationPool().query<{ organizationSubject: string }>(
      "SELECT subject AS \"organizationSubject\" FROM organization_auth_identities WHERE organization_id = $1 AND instance_id = $2 AND provider = 'clerk' LIMIT 1",
      [organizationId, instanceId],
    );
    return result.rows[0] ?? null;
  },
  saveOrganizationIdentity: async ({ organizationId, instanceId, organizationSubject }) => {
    const client = await getMigrationPool().connect();
    try {
      await client.query("BEGIN");
      const local = await client.query<{ subject: string }>(
        "SELECT subject FROM organization_auth_identities WHERE organization_id = $1 AND instance_id = $2 AND provider = 'clerk' FOR UPDATE",
        [organizationId, instanceId],
      );
      const provider = await client.query<{ organization_id: string }>(
        "SELECT organization_id FROM organization_auth_identities WHERE subject = $1 AND instance_id = $2 AND provider = 'clerk' FOR UPDATE",
        [organizationSubject, instanceId],
      );
      if (local.rows[0] && local.rows[0].subject !== organizationSubject) throw new Error("Organization identity cannot be reassigned.");
      if (provider.rows[0] && provider.rows[0].organization_id !== organizationId) throw new Error("Provider organization is already mapped.");
      if (!local.rows[0]) await client.query(
        "INSERT INTO organization_auth_identities (organization_id, provider, instance_id, subject) VALUES ($1, 'clerk', $2, $3)",
        [organizationId, instanceId, organizationSubject],
      );
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  },
  provider: providerOrganizations(() => clerkClient()),
};

export async function setupOrganizations(options: {
  apply: boolean; target: string | undefined; instanceId: string; organizationIds: string[];
}, overrides: Partial<SetupDependencies> = {}) {
  if (options.apply && !["development", "test"].includes(options.target ?? "")) throw new Error("Apply requires WEFT_PROVISION_TARGET=development or test.");
  if (!options.instanceId.trim()) throw new Error("An explicit Clerk instance id is required.");
  if (options.organizationIds.length === 0 || options.organizationIds.some((id) => !uuidPattern.test(id))) throw new Error("Provide one or more exact local organization UUIDs.");
  const deps = { ...defaults, ...overrides };
  const localOrganizations = await deps.localOrganizations(options.organizationIds);
  if (localOrganizations.length !== options.organizationIds.length) throw new Error("One or more exact local organization UUIDs were not found.");
  const providerOrganizations = await deps.provider.listOrganizations();
  const organizations = [];
  for (const local of localOrganizations) {
    const exactMatches = providerOrganizations.filter((candidate) => candidate.publicMetadata?.weftOrganizationId === local.id);
    if (exactMatches.length > 1) throw new Error(`Multiple Clerk organizations carry local UUID ${local.id}.`);
    const currentMapping = await deps.findOrganizationIdentity(local.id, options.instanceId);
    if (currentMapping && exactMatches[0]?.id !== currentMapping.organizationSubject) throw new Error(`Existing organization mapping conflicts for ${local.id}.`);
    if (!currentMapping && exactMatches.length === 0 && !options.apply) {
      organizations.push({ organizationId: local.id, name: local.name, providerOrganizationId: null, action: "create-provider-organization" });
      continue;
    }
    let providerOrganization = exactMatches[0];
    let action = currentMapping ? "already-mapped" : "save-mapping";
    if (!providerOrganization && options.apply) {
      providerOrganization = await deps.provider.createOrganization({ name: local.name, publicMetadata: { weftOrganizationId: local.id } });
      action = "created-provider-organization";
    }
    if (!currentMapping && providerOrganization && options.apply) {
      await deps.saveOrganizationIdentity({ organizationId: local.id, instanceId: options.instanceId, organizationSubject: providerOrganization.id });
    }
    organizations.push({ organizationId: local.id, name: local.name,
      providerOrganizationId: providerOrganization?.id ?? currentMapping?.organizationSubject ?? null, action });
  }
  return { mode: options.apply ? "apply" : "dry-run", instanceId: options.instanceId, organizations };
}

function parseArguments(argv: string[]) {
  const organizationIds: string[] = [];
  let apply = false;
  let instanceId = process.env.WEFT_CLERK_INSTANCE_ID ?? "";
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === "--apply") apply = true;
    else if (argv[index] === "--instance-id") instanceId = argv[++index] ?? "";
    else if (argv[index] === "--organization-id") organizationIds.push(argv[++index] ?? "");
    else throw new Error(`Unknown argument ${argv[index]}.`);
  }
  return { apply, target: process.env.WEFT_PROVISION_TARGET, instanceId, organizationIds };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await setupOrganizations(options, { provider: providerOrganizations(() => clerkClient()) });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await migrationPool?.end();
    migrationPool = undefined;
  }
}

if (process.argv[1]?.endsWith("setup-clerk-organizations.ts")) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Organization setup failed."); process.exitCode = 1; });
}
