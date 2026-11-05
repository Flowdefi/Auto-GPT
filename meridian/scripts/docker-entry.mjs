import { spawn } from "node:child_process";

if (process.env.MERIDIAN_COLLECTIONS_DEMO === "true") {
  const seed = spawn("npx", ["tsx", "scripts/seed-collections-demo.ts"], { stdio: "inherit" });
  const code = await new Promise((resolve) => seed.on("exit", resolve));
  if (code !== 0) process.exit(typeof code === "number" ? code : 1);
}

const server = spawn("npm", ["run", "start"], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
