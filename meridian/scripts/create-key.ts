import "./load-env";
import { flag } from "./load-env";
import { createApiKey, ensureOwnerAccount } from "../src/server/auth";
import { isOwnerEmail, ownerEmails } from "../src/server/owner-policy";
import { selfHosted } from "../src/server/self-host";
import { sqliteGet, sqliteReady } from "../src/server/sqlite";

const name = flag("--name") ?? "email-bot";
const requested = flag("--email")?.trim().toLowerCase();
const workspaceArg = flag("--workspace") ?? "triton";

if (!sqliteReady()) {
  console.error("SQLite is unavailable. Run this from the meridian directory.");
  process.exit(1);
}

if (!selfHosted()) {
  console.error("Set MERIDIAN_SELF_HOSTED=true before creating keys. Paid seats still use Billing.");
  process.exit(1);
}

if (workspaceArg !== "triton" && workspaceArg !== "aether") {
  console.error("Usage: npm run key:create -- --workspace <triton|aether> --name <label> [--email you@example.com]");
  process.exit(1);
}

try {
  let accountId = "";
  let accountEmail = "";
  const email = requested || ownerEmails()[0];
  if (email) {
    if (ownerEmails().length > 0 && !isOwnerEmail(email)) {
      console.error(`${email} is not in MERIDIAN_OWNER_EMAILS`);
      process.exit(1);
    }
    const owner = ensureOwnerAccount(email);
    accountId = owner.id;
    accountEmail = owner.email;
  } else {
    const account = sqliteGet("SELECT id, email FROM accounts WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1");
    if (!account?.id) {
      console.error("No owner account yet. Set MERIDIAN_OWNER_EMAILS or pass --email. A browser account is not required.");
      process.exit(1);
    }
    accountId = String(account.id);
    accountEmail = String(account.email);
  }
  const created = createApiKey(accountId, name, workspaceArg);
  console.error(`API key "${name}" for ${accountEmail} on the ${workspaceArg} desk. This is the only time it will be shown.`);
  console.log("Meridian API key (shown once)");
  console.log(`  account:    ${accountEmail}`);
  console.log(`  workspace:  ${workspaceArg}`);
  console.log(`  name:       ${name.trim()}`);
  console.log(`  prefix:     ${created.prefix}`);
  console.log(`  key:        ${created.key}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
