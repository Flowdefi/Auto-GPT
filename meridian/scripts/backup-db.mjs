import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const sourceDir = process.env.MERIDIAN_DATA_DIR ? path.resolve(process.env.MERIDIAN_DATA_DIR) : path.join(process.cwd(), "data");
const destDir = process.argv[2];
if (!destDir) {
  console.error("Usage: node scripts/backup-db.mjs <backup-directory>");
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonFrom = path.join(sourceDir, "meridian.json");
const sqliteFrom = path.join(sourceDir, "meridian.db");
const jsonTo = path.join(destDir, `meridian-${stamp}.json`);
const sqliteTo = path.join(destDir, `meridian-${stamp}.db`);
copyFileSync(jsonFrom, jsonTo);
const db = new DatabaseSync(sqliteFrom);
if (typeof db.backup === "function") await db.backup(sqliteTo);
else copyFileSync(sqliteFrom, sqliteTo);
db.close();
console.log(JSON.stringify({ jsonTo, sqliteTo }));
