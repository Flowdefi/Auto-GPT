import "./load-env";
import { flag } from "./load-env";
import type { WorkspaceId } from "../src/lib/types";
import { isWorkspaceId } from "../src/lib/workspace-id";
import { syncGraph } from "../src/server/graph-sync";

function workspaceArg(): WorkspaceId {
  const requested = flag("--workspace") ?? "triton";
  if (!isWorkspaceId(requested)) {
    console.error("Usage: npm run sync:graph -- [--workspace triton|aether]");
    process.exit(1);
  }
  return requested;
}

const workspaceId = workspaceArg();

async function main(): Promise<void> {
  const report = await syncGraph(workspaceId);
  if (!report.configured) {
    console.log("Microsoft Graph is not configured. Set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET. Nothing to sync.");
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
