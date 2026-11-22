import { execFileSync } from "node:child_process";
import path from "node:path";

export default function globalSetup(): void {
  execFileSync("npx", ["tsx", "e2e/seed.ts"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
}
