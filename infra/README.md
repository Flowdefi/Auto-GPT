# Live infrastructure

Meridian (Triton / Aether CRM) and Cove (TF Recovery collections) share one
**Prisma Postgres** database in `us-east-1`. Snapshots are the source of truth;
CRM rows, accounts, portfolios, and payments are projections.

## What is already provisioned

- Prisma project `meridian-cove` (region `us-east-1`)
- Tables in `infra/schema.sql` (`snapshots`, `audit_events`, `meridian_crm`,
  `cove_accounts`, `cove_payments`, `cove_portfolios`)
- Both apps boot from `DATABASE_URL` via `ready()` before serving traffic

Set `DATABASE_URL` in `meridian/.env.local` and `cove/.env.local`. Do not commit it.

## Run locally against the live database

```bash
# terminal 1
cd meridian && npm run dev

# terminal 2
cd cove && npm run dev
```

- Meridian health: `http://localhost:3000/api/health` — `postgres.ok` must be true
- Cove health: `http://localhost:3001/api/health`
- TF Recovery portal: `http://localhost:3001/pay`

## Docker + Caddy (public HTTPS)

```bash
cp infra/.env.example infra/.env
# edit DATABASE_URL and domains
docker compose -f infra/docker-compose.yml --profile edge up -d --build
```

Point DNS A/AAAA records for `MERIDIAN_DOMAIN` and `COVE_DOMAIN` at the host.
Caddy obtains Let's Encrypt certificates automatically.

## Seeding

The first process that starts with `DATABASE_URL` and an empty `snapshots` row
writes the demo book (Triton CRM + unlicensed-state inventory). Later boots
hydrate from Postgres instead of local files / localStorage.

Card PAN/CVC is never written. Portal payments store amount, method, and last4.

## Licensing

Start collections work in GA + OH, then MO / KY. FDCPA, Reg F, and TCPA still
apply. See `docs/START-HERE.md`.
