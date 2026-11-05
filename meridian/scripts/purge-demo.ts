import "./load-env";
import { parsePurgeArgs, purgeDemoRecords } from "../src/server/purge-demo";

try {
  const args = parsePurgeArgs(process.argv.slice(2));
  const result = purgeDemoRecords(args.workspaceId, args.dryRun);
  console.log(
    `${result.dryRun ? "Dry run" : "Purged"} ${result.workspaceId}: ${result.contacts} contacts, ${result.companies} companies, ${result.leads} leads, ${result.crmRecords} CRM snapshot rows.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
