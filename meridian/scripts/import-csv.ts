import { readFileSync } from "node:fs";
import { isWorkspaceId } from "../src/lib/workspace-id";
import { formatImportReport, runCsvImport } from "../src/server/csv-import";

function option(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function read(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return readFileSync(path, "utf8");
}

const workspaceId = option("--workspace");
if (!isWorkspaceId(workspaceId)) {
  console.error(
    "Usage: npm run import:csv -- --workspace <triton|aether> [--contacts file.csv] [--companies file.csv] [--prospects file.csv] [--do-not-email] [--invalid-email] [--dry-run]",
  );
  process.exit(1);
}

const contactsPath = option("--contacts");
const companiesPath = option("--companies");
const prospectsPath = option("--prospects");
if (!contactsPath && !companiesPath && !prospectsPath) {
  console.error("Provide --contacts, --companies, and/or --prospects");
  process.exit(1);
}

try {
  const report = runCsvImport({
    workspaceId,
    contactsCsv: read(contactsPath),
    companiesCsv: read(companiesPath),
    prospectsCsv: read(prospectsPath),
    doNotEmail: process.argv.includes("--do-not-email"),
    invalidEmail: process.argv.includes("--invalid-email"),
    dryRun: process.argv.includes("--dry-run"),
  });
  console.log(formatImportReport(report));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
