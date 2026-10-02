import { Pool } from "pg";
import { z } from "zod";

const input = z.object({
  userId: z.uuid(), organizationId: z.uuid(),
  role: z.enum(["owner", "organizer", "staff", "sponsor"]),
}).parse({ userId: process.argv[2], organizationId: process.argv[3], role: process.argv[4] });

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !["development", "test"].includes(process.env.WEFT_PROVISION_TARGET ?? "")) {
  throw new Error("Set DATABASE_URL and WEFT_PROVISION_TARGET=development|test explicitly.");
}

const url = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("DATABASE_URL must be PostgreSQL.");
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
if (!isLocal && url.searchParams.get("sslmode") === "disable") throw new Error("Remote provisioning requires TLS.");
url.searchParams.delete("sslmode");
const pool = new Pool({ connectionString: url.toString(), max: 1, ssl: isLocal ? false : { rejectUnauthorized: true } });
try {
  const result = await pool.query(
    `insert into organization_memberships (organization_id, user_id, role)
     select o.id, u.id, $3 from organizations o cross join users u
     where o.id = $1 and u.id = $2
     on conflict (organization_id, user_id) do update set role = excluded.role, active = true
     returning id`,
    [input.organizationId, input.userId, input.role],
  );
  if (!result.rowCount) throw new Error("Existing user and organization UUIDs are required.");
  console.log(`Membership provisioned: ${result.rows[0].id}`);
} finally {
  await pool.end();
}
