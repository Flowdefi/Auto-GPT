import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { DatabaseFile } from "./models";

const APP = "meridian";

let pool: Pool | null = null;
let poolFailed = false;

export function databaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : undefined;
}

function sslFor(url: string): boolean | { rejectUnauthorized: boolean } {
  if (!/sslmode=require/i.test(url) && !url.includes("prisma.io")) return false;
  return { rejectUnauthorized: true };
}

export function getPool(): Pool | null {
  const url = databaseUrl();
  if (!url || poolFailed) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 6,
      ssl: sslFor(url),
      connectionTimeoutMillis: 8_000,
    });
    pool.on("error", (error) => {
      console.error("Postgres pool error:", error.message);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db.query<T>(sql, params);
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const db = getPool();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const client = await db.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  try {
    await query("SELECT 1 AS ok");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (error) {
    poolFailed = true;
    pool = null;
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "postgres unreachable",
    };
  }
}

export async function readSnapshot(): Promise<{ payload: DatabaseFile; version: number } | null> {
  if (!getPool()) return null;
  const result = await query<{ payload: DatabaseFile; version: number }>(
    "SELECT payload, version FROM snapshots WHERE app = $1",
    [APP],
  );
  const row = result.rows[0];
  return row ?? null;
}

export async function writeSnapshot(payload: DatabaseFile, version: number): Promise<void> {
  if (!getPool()) return;
  await query(
    `INSERT INTO snapshots (app, payload, version, updated_at)
     VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (app) DO UPDATE
       SET payload = EXCLUDED.payload,
           version = EXCLUDED.version,
           updated_at = NOW()`,
    [APP, JSON.stringify(payload), version],
  );
}

export async function writeAudit(kind: string, detail: Record<string, unknown>): Promise<void> {
  if (!getPool()) return;
  await query("INSERT INTO audit_events (app, kind, detail) VALUES ($1, $2, $3::jsonb)", [
    APP,
    kind,
    JSON.stringify(detail),
  ]);
}

export async function upsertCrmRows(db: DatabaseFile): Promise<void> {
  if (!getPool()) return;
  const rows: Array<{ workspaceId: string; kind: string; id: string; label: string; payload: unknown }> = [];
  for (const contact of db.contacts) {
    rows.push({
      workspaceId: contact.workspaceId,
      kind: "contact",
      id: contact.id,
      label: `${contact.firstName} ${contact.lastName}`.trim(),
      payload: contact,
    });
  }
  for (const company of db.companies) {
    rows.push({
      workspaceId: company.workspaceId,
      kind: "company",
      id: company.id,
      label: company.name,
      payload: company,
    });
  }
  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const row of rows) {
        await client.query(
          `INSERT INTO meridian_crm (workspace_id, kind, id, label, payload, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
           ON CONFLICT (workspace_id, kind, id) DO UPDATE
             SET label = EXCLUDED.label,
                 payload = EXCLUDED.payload,
                 updated_at = NOW()`,
          [row.workspaceId, row.kind, row.id, row.label, JSON.stringify(row.payload)],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}
