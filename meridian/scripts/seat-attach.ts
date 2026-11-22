import "./load-env";
import { flag } from "./load-env";
import { attachSeatToEmail } from "../src/server/billing";

const email = flag("--email")?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run seat:attach -- --email owner@example.com");
  process.exit(1);
}

try {
  const result = attachSeatToEmail(email);
  if (result.status === "already") {
    console.log(`Seat already attached for ${result.email}`);
  } else {
    console.log(`Attached a lifetime seat to ${result.email}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
