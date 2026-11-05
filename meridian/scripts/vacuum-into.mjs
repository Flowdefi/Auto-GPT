import { DatabaseSync } from "node:sqlite";

const source = process.argv[2];
const target = process.argv[3];
if (!source || !target) {
  console.error("Usage: node scripts/vacuum-into.mjs <source.db> <target.db>");
  process.exit(1);
}
if (target.includes("'")) {
  console.error("Target path cannot contain a single quote");
  process.exit(1);
}

const db = new DatabaseSync(source);
db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
db.close();
