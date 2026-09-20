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

CREATE TABLE IF NOT EXISTS rag_terms (
  term TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  PRIMARY KEY (term, chunk_id)
);
CREATE INDEX IF NOT EXISTS idx_rag_terms_lookup ON rag_terms(workspace_id, term);

-- Auth, billing, and BYOK live outside persistSqlite's wipe list.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  status TEXT NOT NULL DEFAULT 'pending',
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  kind TEXT NOT NULL,
  email TEXT,
  account_id TEXT,
  redeemed_at TEXT,
  created_at TEXT NOT NULL,
  polar_order_id TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_licenses_account ON licenses(account_id);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id);

CREATE TABLE IF NOT EXISTS workspace_secrets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (account_id, workspace_id, name)
);
CREATE INDEX IF NOT EXISTS idx_secrets_account ON workspace_secrets(account_id, workspace_id);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  at TEXT NOT NULL
);
