import { randomBytes } from "node:crypto";
import "./load-env";
import { flag } from "./load-env";
import { setOwnerPassword } from "../src/server/auth";
import { isOwnerEmail } from "../src/server/owner-policy";
import { selfHosted } from "../src/server/self-hosted";

const email = flag("--email")?.trim().toLowerCase();
const provided = flag("--password");
if (!email || !email.includes("@")) {
  console.error("Usage: npm run owner:set-password -- --email owner@example.com [--password '...']");
  process.exit(1);
}
if (selfHosted() && !isOwnerEmail(email)) {
  console.error(`${email} is not in MERIDIAN_OWNER_EMAILS`);
  process.exit(1);
}

const password = provided ?? randomBytes(18).toString("base64url");

try {
  const account = setOwnerPassword(email, password);
  if (provided) {
    console.log(`Password updated for ${account.email}`);
  } else {
    console.error(`Password set for ${account.email}. This is the only time it will be shown.`);
    console.log(password);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
