import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createAccount } from "../src/server/auth";
import { createLicense } from "../src/server/billing";

const dataDir = path.join(__dirname, "..", ".e2e-data");
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });
process.env.MERIDIAN_DATA_DIR = dataDir;
process.env.MERIDIAN_AUTH_SECRET = "e2e-only-not-a-real-secret-32chars";
process.env.MERIDIAN_SEED_DEMO = "true";

const account = createAccount({ email: "e2e@example.test", name: "Example Operator", password: "sandbox-password-1" });
createLicense({ kind: "minted", email: account.email, accountId: account.id, notes: "e2e seat" });
console.log("e2e seat ready");
