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

## Cloudflare Workers (current live HTTPS)

Temporary preview account **Scandalous Rosehip**. Claim it from the pull request
within 60 minutes of deploy or the workers expire.

| App | URL |
| --- | --- |
| Cove / TF Recovery | https://cove-tfr.scandalous-rosehip.workers.dev |
| TF Recovery pay | https://cove-tfr.scandalous-rosehip.workers.dev/pay |
| Meridian / Triton | https://meridian-triton.scandalous-rosehip.workers.dev |
| Meridian home | https://meridian-triton.scandalous-rosehip.workers.dev/w/triton/home |

Both workers bind **Hyperdrive** `927f2d9158164561b74b0273ef6ae7fe` to the same
Prisma Postgres database.

```bash
# from cove/ or meridian/
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DATABASE_URL"
npx wrangler deploy --temporary   # first time / unclaimed account
# after claiming: npx wrangler deploy
```

`workers.dev` may show a Cloudflare browser check to automated clients.

## Licensing

Start collections work in GA + OH, then MO / KY. FDCPA, Reg F, and TCPA still
apply. See `docs/START-HERE.md`.
