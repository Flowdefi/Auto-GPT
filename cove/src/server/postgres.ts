import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import type { AppData } from "@/lib/types";

const APP = "cove";

let pool: Pool | null = null;
let poolFailed = false;

type HyperdriveBinding = { connectionString: string };

function hyperdriveUrl(): string | undefined {
  try {
    const env = getCloudflareContext().env as { HYPERDRIVE?: HyperdriveBinding };
    return env.HYPERDRIVE?.connectionString;
  } catch {
    return undefined;
  }
}

export function databaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL?.trim();
  if (value) return value;
  return hyperdriveUrl();
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

export async function readSnapshot(): Promise<{ payload: AppData; version: number } | null> {
  if (!getPool()) return null;
  const result = await query<{ payload: AppData; version: number }>(
    "SELECT payload, version FROM snapshots WHERE app = $1",
    [APP],
  );
  return result.rows[0] ?? null;
}

export async function writeSnapshot(payload: AppData, version: number): Promise<void> {
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

export async function projectCove(state: AppData): Promise<void> {
  if (!getPool()) return;
  for (const portfolio of state.portfolios) {
    await query(
      `INSERT INTO cove_portfolios (id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [portfolio.id, JSON.stringify(portfolio)],
    );
  }
  for (const account of state.accounts) {
    await query(
      `INSERT INTO cove_accounts (id, payload, state, disposition, portfolio_id, balance, collected, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE
         SET payload = EXCLUDED.payload,
             state = EXCLUDED.state,
             disposition = EXCLUDED.disposition,
             portfolio_id = EXCLUDED.portfolio_id,
             balance = EXCLUDED.balance,
             collected = EXCLUDED.collected,
             updated_at = NOW()`,
      [
        account.id,
        JSON.stringify(account),
        account.state,
        account.disposition,
        account.portfolioId,
        account.balance,
        account.collected,
      ],
    );
  }
  for (const payment of state.payments) {
    await query(
      `INSERT INTO cove_payments (id, account_id, amount, method, channel, status, created_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (id) DO UPDATE
         SET amount = EXCLUDED.amount,
             status = EXCLUDED.status,
             payload = EXCLUDED.payload`,
      [
        payment.id,
        payment.accountId,
        payment.amount,
        payment.method,
        payment.channel ?? null,
        payment.status,
        payment.at,
        JSON.stringify(payment),
      ],
    );
  }
}
