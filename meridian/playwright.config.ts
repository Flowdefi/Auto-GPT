import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const dataDir = path.join(__dirname, ".e2e-data");
const secret = "e2e-only-not-a-real-secret-32chars";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:3100", ...devices["Desktop Chrome"] },
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npx next dev --port 3100 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MERIDIAN_DATA_DIR: dataDir,
      MERIDIAN_AUTH_SECRET: secret,
      MERIDIAN_SEED_DEMO: "true",
      MERIDIAN_CHANNEL_DELIVER: "sandbox",
      MERIDIAN_METRO2_EXPORT: "disabled",
    },
  },
});
