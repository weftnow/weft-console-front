import { parseCustomerRequest, validateProvisioningDatabaseTarget, validateProvisioningEnvironment } from "./validation.ts";

type Command = "create" | "status" | "retry" | "renew" | "cancel";
type Parsed = { command: Command; requestId?: string; organizationName?: string; ownerEmail?: string; apply: boolean; sendInvitation: boolean };

function parseArguments(argv: string[]): Parsed {
  const command = argv[0] as Command;
  if (!["create", "status", "retry", "renew", "cancel"].includes(command)) throw new Error("Use create, status, retry, renew, or cancel.");
  const values = new Map<string, string>();
  let apply = false;
  let sendInvitation = false;
  for (let index = 1; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--apply") { apply = true; continue; }
    if (flag === "--send-invitation") { sendInvitation = true; continue; }
    if (!["--request-id", "--organization-name", "--owner-email"].includes(flag)) throw new Error(`Unknown argument ${flag}.`);
    if (values.has(flag)) throw new Error(`Duplicate argument ${flag}.`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}.`);
    values.set(flag, value);
  }
  const requestId = values.get("--request-id");
  if (!requestId) throw new Error("--request-id is required.");
  if (command === "create" && (!values.has("--organization-name") || !values.has("--owner-email"))) throw new Error("create requires --organization-name and --owner-email.");
  if (command !== "create" && (values.has("--organization-name") || values.has("--owner-email"))) throw new Error(`${command} does not accept customer input fields.`);
  if ((command === "retry" || command === "renew") && (!apply || !sendInvitation)) throw new Error(`${command} requires --apply --send-invitation.`);
  if (command === "cancel" && (!apply || sendInvitation)) throw new Error("cancel requires --apply and does not send invitations.");
  if (command === "status" && (apply || sendInvitation)) throw new Error("status is read-only.");
  if (command === "create" && apply && !sendInvitation) throw new Error("create --apply requires --send-invitation.");
  if (command === "create" && !apply && sendInvitation) throw new Error("--send-invitation requires --apply.");
  return { command, requestId, organizationName: values.get("--organization-name"), ownerEmail: values.get("--owner-email"), apply, sendInvitation };
}

export async function runProvisioningCommand(argv: string[], env: NodeJS.ProcessEnv = process.env, dependencies: {
  service: {
    createCustomer(input: ReturnType<typeof parseCustomerRequest>, options: { apply: boolean; sendInvitation: boolean }): Promise<unknown>;
    retryCustomer(requestId: string, instanceId: string): Promise<unknown>;
    renewOwnerInvitation(requestId: string, instanceId: string): Promise<unknown>;
    cancelCustomer(requestId: string, instanceId: string): Promise<unknown>;
    readCustomerStatus(requestId: string, instanceId: string): Promise<unknown>;
  };
  validateEnvironment?: typeof validateProvisioningEnvironment;
}) {
  const parsed = parseArguments(argv);
  if (parsed.command === "create") {
    if (!parsed.apply) {
      const input = parseCustomerRequest({ requestId: parsed.requestId, organizationName: parsed.organizationName,
        ownerEmail: parsed.ownerEmail, instanceId: env.WEFT_CLERK_INSTANCE_ID || "dry-run", operator: env.WEFT_PROVISION_OPERATOR || "dry-run" });
      return dependencies.service.createCustomer(input, { apply: false, sendInvitation: false });
    }
    const config = (dependencies.validateEnvironment ?? validateProvisioningEnvironment)(env);
    const input = parseCustomerRequest({ requestId: parsed.requestId, organizationName: parsed.organizationName,
      ownerEmail: parsed.ownerEmail, instanceId: config.instanceId, operator: config.operator });
    return dependencies.service.createCustomer(input, { apply: true, sendInvitation: true });
  }
  if (parsed.command === "status") {
    if (!env.WEFT_CLERK_INSTANCE_ID?.trim()) throw new Error("WEFT_CLERK_INSTANCE_ID is required for status.");
    validateProvisioningDatabaseTarget(env);
    return dependencies.service.readCustomerStatus(parsed.requestId!, env.WEFT_CLERK_INSTANCE_ID);
  }
  const config = (dependencies.validateEnvironment ?? validateProvisioningEnvironment)(env);
  if (parsed.command === "retry") return dependencies.service.retryCustomer(parsed.requestId!, config.instanceId);
  if (parsed.command === "renew") return dependencies.service.renewOwnerInvitation(parsed.requestId!, config.instanceId);
  return dependencies.service.cancelCustomer(parsed.requestId!, config.instanceId);
}
