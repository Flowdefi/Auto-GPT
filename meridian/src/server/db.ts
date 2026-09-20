import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import { id } from "@/lib/format";
import { emptyDb, type DatabaseFile } from "./models";
import { getPool, readSnapshot, upsertCrmRows, writeAudit, writeSnapshot } from "./postgres";
import { seedServerData } from "./seed-db";
import { persistSqlite, seedCrmSnapshot } from "./sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "meridian.json");
const OWNER_EMAIL = "ayflow@pm.me";

let cache: DatabaseFile | null = null;
let persistGeneration = 1;
let boot: Promise<DatabaseFile> | null = null;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrate(db: DatabaseFile): DatabaseFile {
  if (!db.events) db.events = [];
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

function persistLocal(db: DatabaseFile): void {
  ensureDir();
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

function persistRemote(db: DatabaseFile): void {
  if (!getPool()) return;
  persistGeneration += 1;
  const generation = persistGeneration;
  void writeSnapshot(db, generation)
    .then(() => upsertCrmRows(db))
    .catch((error) => {
      console.error("Postgres persist failed:", error instanceof Error ? error.message : error);
    });
}

export function persist(db: DatabaseFile): void {
  persistLocal(db);
  persistRemote(db);
}

/** Load Postgres first when DATABASE_URL is set so hosts share one book. */
export async function ready(): Promise<DatabaseFile> {
  if (cache && boot) return cache;
  if (!boot) {
    boot = (async () => {
      if (getPool()) {
        try {
          const remote = await readSnapshot();
          if (remote?.payload?.lists?.length) {
            persistGeneration = remote.version || 1;
            cache = migrate(remote.payload);
            persistLocal(cache);
            seedCrmSnapshot();
            return cache;
          }
          const seeded = loadDb();
          await writeSnapshot(seeded, persistGeneration);
          await upsertCrmRows(seeded);
          await writeAudit("seed", { lists: seeded.lists.length, contacts: seeded.contacts.length });
          return seeded;
        } catch (error) {
          console.error("Postgres boot failed, using local store:", error instanceof Error ? error.message : error);
        }
      }
      return loadDb();
    })();
  }
  return boot;
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
