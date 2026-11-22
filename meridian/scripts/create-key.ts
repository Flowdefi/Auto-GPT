import { createApiKey } from "../src/server/auth";
import { selfHosted } from "../src/server/self-host";
import { sqliteAll } from "../src/server/sqlite";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
}

const workspaceId = arg("--workspace");
const name = arg("--name");
const email = arg("--email")?.trim().toLowerCase();

if (!selfHosted()) {
  console.error("Set MERIDIAN_SELF_HOSTED=true before creating keys. Paid seats still use Billing.");
  process.exit(1);
}
if (workspaceId !== "triton" && workspaceId !== "aether") {
  console.error("Usage: npm run key:create -- --workspace <triton|aether> --name <label> [--email you@example.com]");
  process.exit(1);
}
if (!name?.trim()) {
  console.error("--name is required, for example email-bot");
  process.exit(1);
}

const accounts = sqliteAll(
  email
    ? "SELECT id, email, role FROM accounts WHERE email = ? ORDER BY created_at ASC"
    : "SELECT id, email, role FROM accounts WHERE role = 'owner' ORDER BY created_at ASC",
  ...(email ? [email] : []),
);
const account = accounts[0];
if (!account?.id) {
  console.error(email ? `No account for ${email}. Sign up first.` : "No owner account yet. Sign up, then rerun.");
  process.exit(1);
}

const created = createApiKey(String(account.id), name, workspaceId);
console.log("Meridian API key (shown once)");
console.log(`  account:    ${String(account.email)}`);
console.log(`  workspace:  ${workspaceId}`);
console.log(`  name:       ${name.trim()}`);
console.log(`  prefix:     ${created.prefix}`);
console.log(`  key:        ${created.key}`);
