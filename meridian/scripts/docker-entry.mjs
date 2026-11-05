import { spawn } from "node:child_process";

async function run(command, args) {
  const child = spawn(command, args, { stdio: "inherit" });
  const code = await new Promise((resolve) => child.on("exit", resolve));
  if (code !== 0) process.exit(typeof code === "number" ? code : 1);
}

if (process.env.MERIDIAN_COLLECTIONS_DEMO === "true") {
  await run("npx", ["tsx", "scripts/seed-collections-demo.ts"]);
}
await run("npx", ["tsx", "scripts/seed-owner.ts"]);

const server = spawn("npm", ["run", "start"], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
