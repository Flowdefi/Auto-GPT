import { DatabaseSync } from "node:sqlite";

const source = process.argv[2];
const dest = process.argv[3];
if (!source || !dest) {
  console.error("Usage: node scripts/sqlite-backup.mjs <source.db> <dest.db>");
  process.exit(1);
}

const db = new DatabaseSync(source);
const escaped = dest.replaceAll("'", "''");
db.exec(`VACUUM INTO '${escaped}'`);
db.close();
