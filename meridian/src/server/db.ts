import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { id } from "@/lib/format";
import { emptyDb, type DatabaseFile } from "./models";
import { seedServerData } from "./seed-db";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "meridian.json");

let cache: DatabaseFile | null = null;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDb(): DatabaseFile {
  if (cache) return cache;
  ensureDir();
  if (!existsSync(DATA_FILE)) {
    cache = seedServerData(emptyDb());
    persist(cache);
    return cache;
  }
  const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DatabaseFile;
  if (!parsed.lists?.length) {
    cache = seedServerData(parsed.version ? parsed : emptyDb());
    persist(cache);
    return cache;
  }
  cache = parsed;
  return cache;
}

export function persist(db: DatabaseFile): void {
  ensureDir();
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DATA_FILE);
  cache = db;
}

export function mutate<T>(fn: (db: DatabaseFile) => T): T {
  const db = loadDb();
  const result = fn(db);
  persist(db);
  return result;
}

export function resetDb(): DatabaseFile {
  cache = seedServerData(emptyDb());
  persist(cache);
  return cache;
}

export function nextId(prefix: string): string {
  return id(prefix);
}
