-- Meridian + Cove shared book. Apply against Prisma Postgres (or any Postgres 16+).
-- Source of truth is snapshots.payload (JSONB). The other tables are projections.

CREATE TABLE IF NOT EXISTS snapshots (
  app TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  app TEXT NOT NULL,
  kind TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_events_app_at ON audit_events (app, at DESC);

CREATE TABLE IF NOT EXISTS cove_portfolios (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cove_accounts (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  state TEXT,
  disposition TEXT,
  portfolio_id TEXT,
  balance NUMERIC,
  collected NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cove_payments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  channel TEXT,
  status TEXT NOT NULL,
  created_at TEXT,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS meridian_crm (
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, kind, id)
);

CREATE TABLE IF NOT EXISTS meridian_mail_events (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
