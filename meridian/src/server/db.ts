import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { id } from "@/lib/format";
import { emptyDb, type DatabaseFile } from "./models";
import { seedServerData } from "./seed-db";
import { indexLiveRecords } from "./live-index";
import { persistSqlite, seedCrmSnapshot } from "./sqlite";
import { seedCrmRecords } from "./crm";
import { seedSegmentsInto } from "./segments";
import { seedDemoLeads, seedWorkflows } from "./workflow";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "meridian.json");
const OWNER_EMAIL = "ayflow@pm.me";

let cache: DatabaseFile | null = null;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

const COLLECTIONS: Array<keyof DatabaseFile> = [
  "events",
  "companies",
  "contacts",
  "leads",
  "submissions",
  "inbox",
  "mailboxes",
  "workflows",
  "runs",
  "tasks",
  "crawls",
  "seoPages",
  "seoIssues",
  "keywords",
  "ranks",
  "briefs",
  "segments",
  "aiAudit",
];

function migrate(db: DatabaseFile): DatabaseFile {
  for (const key of COLLECTIONS) {
    if (!Array.isArray(db[key])) {
      (db as unknown as Record<string, unknown[]>)[key] = [];
    }
  }
  seedCrmRecords(db);
  seedWorkflows(db);
  seedDemoLeads(db);
  seedSegmentsInto(db);
  const hasOwner = db.members.some((member) => member.email === OWNER_EMAIL);
  if (!hasOwner) {
    db.members.push({
      id: "mem_triton_owner_proof",
      listId: "triton_list_test",
      email: OWNER_EMAIL,
      firstName: "Desk",
      lastName: "Owner",
      company: "Triton Financial Solutions",
      seedLocked: false,
      subscribed: true,
    });
  }
  if (db.nodes.length < 74) {
    const fresh = seedServerData(emptyDb());
    db.nodes = fresh.nodes;
    db.edges = fresh.edges;
    db.chunks = fresh.chunks;
  }
  return db;
}

export function loadDb(): DatabaseFile {
  if (cache) return cache;
  ensureDir();
  if (!existsSync(DATA_FILE)) {
    cache = migrate(seedServerData(emptyDb()));
    persist(cache);
    seedCrmSnapshot();
    return cache;
  }
  const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as DatabaseFile;
  if (!parsed.lists?.length) {
    cache = migrate(seedServerData(parsed.version ? parsed : emptyDb()));
    persist(cache);
    seedCrmSnapshot();
    return cache;
  }
  cache = migrate(parsed);
  persist(cache);
  seedCrmSnapshot();
  return cache;
}

export function persist(db: DatabaseFile): void {
  ensureDir();
  indexLiveRecords(db);
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DATA_FILE);
  cache = db;
  try {
    persistSqlite(db);
  } catch (error) {
    console.warn("SQLite persist skipped:", error instanceof Error ? error.message : error);
  }
}

export function mutate<T>(fn: (db: DatabaseFile) => T): T {
  const db = loadDb();
  const result = fn(db);
  persist(db);
  return result;
}

export function resetDb(): DatabaseFile {
  cache = migrate(seedServerData(emptyDb()));
  persist(cache);
  return cache;
}

export function nextId(prefix: string): string {
  return id(prefix);
}
