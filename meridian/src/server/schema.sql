-- Meridian operational, CRM, graph, and RAG schema.
-- Runtime: SQLite (data/meridian.db) with JSON backup (data/meridian.json).

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS crm_records (
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, kind, id)
);
CREATE INDEX IF NOT EXISTS idx_crm_kind ON crm_records(workspace_id, kind);

CREATE TABLE IF NOT EXISTS email_lists (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_list_members (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company TEXT NOT NULL,
  contact_id TEXT,
  seed_locked INTEGER NOT NULL DEFAULT 1,
  subscribed INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_members_list ON email_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON email_list_members(email);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bulk_campaigns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_id TEXT NOT NULL,
  template_id TEXT,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  reply_to TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  intended INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  unsubscribed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS outbound_messages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  provider_id TEXT,
  error TEXT,
  unsubscribe_token TEXT NOT NULL,
  sent_at TEXT,
  opened INTEGER NOT NULL DEFAULT 0,
  clicked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON outbound_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_token ON outbound_messages(unsubscribe_token);

CREATE TABLE IF NOT EXISTS suppressions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_events (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  url TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_message ON mail_events(message_id);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_nodes_ws ON graph_nodes(workspace_id, kind);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  src TEXT NOT NULL,
  dst TEXT NOT NULL,
  rel TEXT NOT NULL,
  weight REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edges_src ON graph_edges(src);
CREATE INDEX IF NOT EXISTS idx_edges_dst ON graph_edges(dst);

CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  terms TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_ws ON rag_chunks(workspace_id);

CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(
  chunk_id UNINDEXED,
  workspace_id UNINDEXED,
  title,
  text,
  tokenize = 'porter'
);
