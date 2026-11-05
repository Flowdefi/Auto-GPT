import "./load-env";
import { flag } from "./load-env";
import { createApiKey, ensureOwnerAccount } from "../src/server/auth";
import { isOwnerEmail, ownerEmails } from "../src/server/owner-policy";
import { selfHosted } from "../src/server/self-hosted";
import { sqliteGet, sqliteReady } from "../src/server/sqlite";

const name = flag("--name") ?? "email-bot";
const requested = flag("--email")?.trim().toLowerCase();

if (!sqliteReady()) {
  console.error("SQLite is unavailable. Run this from the meridian directory.");
  process.exit(1);
}

try {
  let accountId = "";
  let accountEmail = "";
  if (selfHosted()) {
    const email = requested || ownerEmails()[0];
    if (!email) {
      console.error("Set MERIDIAN_OWNER_EMAILS or pass --email. A browser account is not required.");
      process.exit(1);
    }
    if (!isOwnerEmail(email)) {
      console.error(`${email} is not in MERIDIAN_OWNER_EMAILS`);
      process.exit(1);
    }
    const owner = ensureOwnerAccount(email);
    accountId = owner.id;
    accountEmail = owner.email;
  } else {
    const account = requested
      ? sqliteGet("SELECT id, email FROM accounts WHERE email = ?", requested)
      : sqliteGet("SELECT id, email FROM accounts WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1");
    if (!account?.id) {
      console.error("No owner account yet.");
      process.exit(1);
    }
    accountId = String(account.id);
    accountEmail = String(account.email);
  }
  const created = createApiKey(accountId, name);
  console.error(`API key "${name}" for ${accountEmail} on the triton desk. This is the only time it will be shown.`);
  console.log(created.key);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
