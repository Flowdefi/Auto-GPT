import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const rows = Number(process.env.BENCH_ROWS ?? 100_000);
process.env.MERIDIAN_DATA_DIR = mkdtempSync(path.join(tmpdir(), "meridian-bench-"));
process.env.MERIDIAN_SEED_DEMO = "false";

const lines = ["account_ref,consumer_name,consumer_state,zip,last4,balance"];
for (let index = 0; index < rows; index += 1) {
  const state = index % 20 === 0 ? "CA" : "OH";
  lines.push(`B${index},Example ${index % 100},${state},44101,${String(index % 10000).padStart(4, "0")},10.00`);
}
const csv = lines.join("\n");

async function main(): Promise<void> {
  const started = Date.now();
  const loaded = await import("../src/server/collections/service");
  const parsedAt = Date.now();
  const result = loaded.importPortfolio({ workspaceId: "triton", csv, portfolioId: "pf_bench" });
  const finished = Date.now();
  console.log(JSON.stringify({
    rows,
    created: result.created,
    quarantined: result.quarantined,
    returnedAccounts: result.accounts.length,
    loadMs: parsedAt - started,
    importMs: finished - parsedAt,
    totalMs: finished - started,
  }));
}

void main();
