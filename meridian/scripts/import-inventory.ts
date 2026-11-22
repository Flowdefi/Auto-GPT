import { readFileSync } from "node:fs";
import "./load-env";
import { flag, positional } from "./load-env";
import { xlsxToCsv } from "../src/lib/collections/xlsx";
import { isWorkspaceId } from "../src/lib/workspace-id";
import { formatInventoryReport, importPortfolioCsv } from "../src/server/inventory-import";

const file = positional()[0] ?? flag("--file");
const workspaceId = flag("--workspace") ?? "triton";
if (!file || !isWorkspaceId(workspaceId)) {
  console.error("Usage: npm run import:inventory -- [--workspace triton|aether] [--dry-run] file.xlsx|file.csv");
  process.exit(1);
}

try {
  const bytes = readFileSync(file);
  const csv = file.toLowerCase().endsWith(".xlsx") ? xlsxToCsv(bytes) : bytes.toString("utf8");
  const report = importPortfolioCsv(workspaceId, csv, process.argv.includes("--dry-run"));
  console.log(formatInventoryReport(report));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
