-- Meridian operational + graph RAG schema (file-backed implementation in src/server)

CREATE TABLE email_lists (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE email_list_members (
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

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT NOT NULL,
  html TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE bulk_campaigns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  list_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  status TEXT NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE outbound_messages (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  "to" TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL,
  provider_id TEXT
);

CREATE TABLE suppressions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  label TEXT NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  src TEXT NOT NULL,
  dst TEXT NOT NULL,
  rel TEXT NOT NULL,
  weight REAL NOT NULL
);

CREATE TABLE rag_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  terms TEXT NOT NULL
);

CREATE INDEX idx_members_list ON email_list_members(list_id);
CREATE INDEX idx_nodes_ws ON graph_nodes(workspace_id);
CREATE INDEX idx_edges_src ON graph_edges(src);
CREATE INDEX idx_chunks_ws ON rag_chunks(workspace_id);
