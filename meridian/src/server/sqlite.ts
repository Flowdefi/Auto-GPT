import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { embedLocal } from "./ai/embeddings";
import type { DatabaseFile } from "./models";

const DATA_DIR = path.join(process.cwd(), "data");
const SQLITE_FILE = path.join(DATA_DIR, "meridian.db");

type RunResult = { changes?: number };
type Statement = {
  run: (...params: unknown[]) => RunResult;
  all: (...params: unknown[]) => Record<string, unknown>[];
  get: (...params: unknown[]) => Record<string, unknown> | undefined;
};

type SqliteHandle = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
  close: () => void;
};

let handle: SqliteHandle | null = null;
let available = false;

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function open(): SqliteHandle | null {
  if (handle) return handle;
  try {
    ensureDir();
    handle = new DatabaseSync(SQLITE_FILE) as unknown as SqliteHandle;
    handle.exec("PRAGMA journal_mode = WAL;");
    handle.exec("PRAGMA foreign_keys = ON;");
    const schema = readFileSync(path.join(process.cwd(), "src/server/schema.sql"), "utf8");
    handle.exec(schema);
    available = true;
    return handle;
  } catch (error) {
    console.warn("SQLite unavailable, JSON store only:", error instanceof Error ? error.message : error);
    available = false;
    return null;
  }
}

export function sqliteReady(): boolean {
  if (handle && available) return true;
  open();
  return available;
}

function replaceTable(db: SqliteHandle, table: string, rows: Array<Record<string, unknown>>, columns: string[]): void {
  db.exec(`DELETE FROM ${table}`);
  if (rows.length === 0) return;
  const placeholders = columns.map(() => "?").join(",");
  const stmt = db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`);
  for (const row of rows) {
    stmt.run(...columns.map((column) => row[column] ?? null));
  }
}

export function persistSqlite(state: DatabaseFile): void {
  const db = open();
  if (!db) return;
  db.exec("BEGIN");
  try {
    replaceTable(
      db,
      "email_lists",
      state.lists.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        name: row.name,
        description: row.description,
        kind: row.kind,
      })),
      ["id", "workspace_id", "name", "description", "kind"],
    );
    replaceTable(
      db,
      "email_list_members",
      state.members.map((row) => ({
        id: row.id,
        list_id: row.listId,
        email: row.email,
        first_name: row.firstName,
        last_name: row.lastName,
        company: row.company,
        contact_id: row.contactId ?? null,
        seed_locked: row.seedLocked ? 1 : 0,
        subscribed: row.subscribed ? 1 : 0,
      })),
      ["id", "list_id", "email", "first_name", "last_name", "company", "contact_id", "seed_locked", "subscribed"],
    );
    replaceTable(
      db,
      "email_templates",
      state.templates.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        name: row.name,
        subject: row.subject,
        preview_text: row.previewText,
        html: row.html,
        text: row.text,
      })),
      ["id", "workspace_id", "name", "subject", "preview_text", "html", "text"],
    );
    replaceTable(
      db,
      "bulk_campaigns",
      state.campaigns.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        name: row.name,
        list_id: row.listId,
        template_id: row.templateId ?? null,
        subject: row.subject,
        preview_text: row.previewText,
        html: row.html,
        text: row.text,
        from_name: row.fromName,
        from_email: row.fromEmail,
        reply_to: row.replyTo,
        status: row.status,
        created_at: row.createdAt,
        sent_at: row.sentAt ?? null,
        intended: row.intended,
        delivered: row.delivered,
        skipped: row.skipped,
        failed: row.failed,
        unsubscribed: row.unsubscribed,
      })),
      [
        "id",
        "workspace_id",
        "name",
        "list_id",
        "template_id",
        "subject",
        "preview_text",
        "html",
        "text",
        "from_name",
        "from_email",
        "reply_to",
        "status",
        "created_at",
        "sent_at",
        "intended",
        "delivered",
        "skipped",
        "failed",
        "unsubscribed",
      ],
    );
    replaceTable(
      db,
      "outbound_messages",
      state.messages.map((row) => ({
        id: row.id,
        campaign_id: row.campaignId,
        workspace_id: row.workspaceId,
        to: row.to,
        subject: row.subject,
        status: row.status,
        provider: row.provider ?? null,
        provider_id: row.providerId ?? null,
        error: row.error ?? null,
        unsubscribe_token: row.unsubscribeToken,
        sent_at: row.sentAt ?? null,
        opened: row.opened ?? 0,
        clicked: row.clicked ?? 0,
      })),
      [
        "id",
        "campaign_id",
        "workspace_id",
        "to",
        "subject",
        "status",
        "provider",
        "provider_id",
        "error",
        "unsubscribe_token",
        "sent_at",
        "opened",
        "clicked",
      ],
    );
    replaceTable(
      db,
      "suppressions",
      state.suppressions.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        email: row.email,
        reason: row.reason,
        at: row.at,
      })),
      ["id", "workspace_id", "email", "reason", "at"],
    );
    replaceTable(
      db,
      "mail_events",
      state.events.map((row) => ({
        id: row.id,
        message_id: row.messageId,
        type: row.type,
        at: row.at,
        url: row.url ?? null,
      })),
      ["id", "message_id", "type", "at", "url"],
    );
    replaceTable(
      db,
      "graph_nodes",
      state.nodes.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        kind: row.kind,
        ref_id: row.refId,
        label: row.label,
        text: row.text,
      })),
      ["id", "workspace_id", "kind", "ref_id", "label", "text"],
    );
    replaceTable(
      db,
      "graph_edges",
      state.edges.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        src: row.src,
        dst: row.dst,
        rel: row.rel,
        weight: row.weight,
      })),
      ["id", "workspace_id", "src", "dst", "rel", "weight"],
    );
    replaceTable(
      db,
      "rag_chunks",
      state.chunks.map((row) => ({
        id: row.id,
        workspace_id: row.workspaceId,
        node_id: row.nodeId,
        title: row.title,
        text: row.text,
        terms: JSON.stringify(row.terms),
      })),
      ["id", "workspace_id", "node_id", "title", "text", "terms"],
    );
    db.exec("DELETE FROM rag_terms");
    const termInsert = db.prepare("INSERT OR IGNORE INTO rag_terms (term, chunk_id, workspace_id) VALUES (?, ?, ?)");
    for (const chunk of state.chunks) {
      for (const term of chunk.terms.slice(0, 80)) {
        termInsert.run(term, chunk.id, chunk.workspaceId);
      }
    }
    db.exec("DELETE FROM rag_vectors");
    const vectorInsert = db.prepare("INSERT INTO rag_vectors (chunk_id, dim, vector) VALUES (?, ?, ?)");
    for (const chunk of state.chunks) {
      const vector = embedLocal(`${chunk.title} ${chunk.text}`);
      vectorInsert.run(chunk.id, vector.length, JSON.stringify(Array.from(vector)));
    }
    syncOperationalCrm(db, state);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run("version", String(state.version));
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run("synced_at", new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const CRM_KINDS = [
  "users",
  "companies",
  "contacts",
  "inventory",
  "deals",
  "activities",
  "tasks",
  "tickets",
  "conversations",
  "campaigns",
  "emails",
  "segments",
  "forms",
  "sequences",
  "pages",
  "keywords",
  "audits",
  "workflows",
  "reports",
  "quotes",
  "meetings",
] as const;

function recordLabel(kind: string, record: Record<string, unknown>): string {
  if (typeof record.name === "string") return record.name;
  if (typeof record.title === "string") return record.title;
  if (typeof record.term === "string") return record.term;
  if (typeof record.firstName === "string") {
    return `${record.firstName} ${String(record.lastName ?? "")}`.trim();
  }
  if (typeof record.subject === "string") return record.subject;
  return `${kind}:${String(record.id ?? "")}`;
}

export function seedCrmSnapshot(): void {
  const db = open();
  if (!db) return;
  const existing = db.prepare("SELECT COUNT(*) AS n FROM crm_records").get() as { n?: number } | undefined;
  if ((existing?.n ?? 0) > 0) return;
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO crm_records (workspace_id, kind, id, label, json, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const workspaces: Array<[WorkspaceId, WorkspaceData]> = [
    ["triton", seedTriton()],
    ["aether", seedAether()],
  ];
  db.exec("BEGIN");
  try {
    for (const [workspaceId, data] of workspaces) {
      for (const kind of CRM_KINDS) {
        const rows = data[kind] as unknown as Array<Record<string, unknown>>;
        for (const record of rows) {
          const id = String(record.id ?? "");
          if (!id) continue;
          insert.run(workspaceId, kind, id, recordLabel(kind, record), JSON.stringify(record), now);
        }
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function syncOperationalCrm(db: SqliteHandle, state: DatabaseFile): void {
  const now = new Date().toISOString();
  const upsert = db.prepare(
    `INSERT INTO crm_records (workspace_id, kind, id, label, json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, kind, id) DO UPDATE SET
       label = excluded.label,
       json = excluded.json,
       updated_at = excluded.updated_at`,
  );
  for (const company of state.companies) {
    upsert.run(company.workspaceId, "companies", company.id, company.name, JSON.stringify(company), company.enrichedAt ?? now);
  }
  for (const contact of state.contacts) {
    const label = `${contact.firstName} ${contact.lastName}`.trim() || contact.email;
    upsert.run(contact.workspaceId, "contacts", contact.id, label, JSON.stringify(contact), contact.lastActivityAt || now);
  }
  for (const lead of state.leads) {
    upsert.run(lead.workspaceId, "leads", lead.id, `${lead.status} ${lead.band}`, JSON.stringify(lead), lead.updatedAt);
  }
}

export function loadVector(chunkId: string): Float32Array | null {
  const db = open();
  if (!db) return null;
  try {
    const row = db.prepare("SELECT vector FROM rag_vectors WHERE chunk_id = ?").get(chunkId);
    if (!row?.vector || typeof row.vector !== "string") return null;
    const values = JSON.parse(row.vector) as number[];
    if (!Array.isArray(values) || values.length === 0) return null;
    return Float32Array.from(values);
  } catch {
    return null;
  }
}

export function upsertVectors(rows: Array<{ id: string; vector: Float32Array }>): void {
  const db = open();
  if (!db || rows.length === 0) return;
  const stmt = db.prepare("INSERT OR REPLACE INTO rag_vectors (chunk_id, dim, vector) VALUES (?, ?, ?)");
  for (const row of rows) {
    stmt.run(row.id, row.vector.length, JSON.stringify(Array.from(row.vector)));
  }
}

export function crmSnapshot(workspaceId: WorkspaceId): { counts: Record<string, number>; sample: Array<{ kind: string; id: string; label: string }> } {
  const db = open();
  if (!db) return { counts: {}, sample: [] };
  const counts: Record<string, number> = {};
  const rows = db.prepare("SELECT kind, COUNT(*) AS n FROM crm_records WHERE workspace_id = ? GROUP BY kind").all(workspaceId);
  for (const row of rows) {
    counts[String(row.kind)] = Number(row.n ?? 0);
  }
  const sample = db
    .prepare("SELECT kind, id, label FROM crm_records WHERE workspace_id = ? ORDER BY kind, label LIMIT 40")
    .all(workspaceId)
    .map((row) => ({ kind: String(row.kind), id: String(row.id), label: String(row.label) }));
  return { counts, sample };
}

export function searchFts(workspaceId: WorkspaceId, prompt: string, limit = 8): Array<{ chunkId: string; score: number }> {
  const db = open();
  if (!db) return [];
  const terms = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .slice(0, 12);
  if (terms.length === 0) return [];
  const placeholders = terms.map(() => "?").join(",");
  try {
    const rows = db
      .prepare(
        `SELECT chunk_id AS chunkId, COUNT(*) AS hits
         FROM rag_terms
         WHERE workspace_id = ? AND term IN (${placeholders})
         GROUP BY chunk_id
         ORDER BY hits DESC
         LIMIT ?`,
      )
      .all(workspaceId, ...terms, limit);
    return rows.map((row) => ({
      chunkId: String(row.chunkId),
      score: Number(row.hits ?? 0),
    }));
  } catch {
    return [];
  }
}

export function sqliteStats(): { path: string; ready: boolean } {
  return { path: SQLITE_FILE, ready: sqliteReady() };
}
