import "./load-env";
import { flag } from "./load-env";
import { createApiKey } from "../src/server/auth";
import { sqliteGet, sqliteReady } from "../src/server/sqlite";

const name = flag("--name") ?? "email-bot";
const email = flag("--email")?.trim().toLowerCase();

if (!sqliteReady()) {
  console.error("SQLite is unavailable. Run this from the meridian directory.");
  process.exit(1);
}

const account = email
  ? sqliteGet("SELECT id, email FROM accounts WHERE email = ?", email)
  : sqliteGet("SELECT id, email FROM accounts WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1");

if (!account?.id) {
  console.error("No owner account. Sign up at /signup, then rerun: npm run key:create -- --name email-bot");
  process.exit(1);
}

try {
  const created = createApiKey(String(account.id), name);
  console.error(`API key "${name}" for ${String(account.email)}. This is the only time it will be shown.`);
  console.log(created.key);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
