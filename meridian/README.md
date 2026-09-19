# Meridian

Enterprise customer platform — a HubSpot-class suite (Smart CRM, Sales, Marketing, Service, Content/CMS, SEO, Automation, Reporting, Compliance, and integrated AI) with a native-feeling **iOS + web** client.

Two workspaces ship fully wired:

1. **Triton Financial Solutions / DebtMarket** (`debtmarket.net`) — full build for a charged-off receivables buyer, broker, and marketplace. Institutional only. FDCPA-aware / RMAI-aligned. No consumer contact.
2. **Aether Digital Markets** — thinner crypto twin (OTC, listings, custody, market making) ready to rebrand when the second firm is named.

## Hubs (aligned to HubSpot Enterprise / Breeze)

| Hub | What you get |
| --- | --- |
| Home | Forecast snapshot, tasks, live inventory |
| CRM | Contacts, companies, activity log, create contact |
| Inbox | Shared conversations, reply, unread |
| Sales | Pipeline board, stage moves, forecast categories, sequences, deal AI |
| Marketplace | Portfolios / blocks with face, ask, media, vintage |
| Marketing | Campaigns, emails, lists, forms |
| Service | Tickets with status transitions |
| CMS | Website, landing, and blog objects for the public site |
| SEO | Keywords, positions, audit recommendations |
| Automation | Workflow enrollments |
| Reporting | Cross-hub dashboards |
| Compliance | Industry playbooks + open tickets |
| AI | Assistant + prospecting / data / customer agents, grounded in CRM data |

AI runs **on-device against workspace records** (no API key required). Prompts like “score FHB”, “draft email to Lena”, “forecast”, “compliance”, and “inbox” use live deals and tapes.

## iOS and web

- Responsive web app with a desktop left nav (HubSpot-style) and an iOS bottom tab bar.
- PWA: `public/manifest.json`, Apple web-app meta, `viewport-fit=cover`, safe-area padding.
- Home-screen install on iPhone (Share → Add to Home Screen).
- `capacitor.config.ts` is ready for `npx cap add ios` when you want a native wrapper.

## Bulk email (HubSpot-style)

Open **Marketing → Bulk send**. Mail is addressed from `portfolios@debtmarket.net` with:

- HTML + plain-text parts
- Preview text
- Physical address + institutional disclaimer
- One-click `List-Unsubscribe` + public `/u/[token]` page
- Suppression list
- Seed CRM addresses locked (no mail to demo bank/buyer inboxes)
- Add a real recipient, then **Send test** or **Send to sendable list**

Delivery order:

1. **Resend** (`RESEND_API_KEY`) — From `portfolios@debtmarket.net` after SPF / DKIM / DMARC on `debtmarket.net`
2. **AgentMail** (`AGENTMAIL_API_KEY`) — delivers immediately from `portfolios@agentmail.to` with **Reply-To** `portfolios@debtmarket.net` (no spoofed From)

A proof campaign already landed at `ayflow@pm.me` from the Triton AgentMail inbox. Seed CRM addresses stay locked. Opens, clicks, unsubscribes, bounces, and complaints write into the database. Sends are paced at 400ms.

Without a provider key the composer still works and returns a clear error instead of silently faking delivery.

## Database + RAG graph

First API call creates `data/meridian.json` and `data/meridian.db` (SQLite):

- Relational CRM snapshot (companies, contacts, deals, inventory, tickets, CMS, SEO, …)
- Email lists, members, templates, campaigns, outbound messages, suppressions, events
- Knowledge graph nodes/edges
- RAG chunks with **FTS5 + lexical** retrieval and neighbor expansion

Schema: [`src/server/schema.sql`](src/server/schema.sql). Explore it in **Graph / RAG**. Health: `GET /api/health`. Snapshot: `GET /api/crm/snapshot?workspace=triton`. AI calls `/api/rag/query` before answering.

## Run

```bash
cd meridian
npm install
cp .env.example .env.local   # add AGENTMAIL_API_KEY or RESEND_API_KEY to send from the UI
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a workspace.

```bash
npm run build && npm run start
```

Docker (persists `data/`):

```bash
docker compose up --build
```

Health: `GET /api/health`

Demo CRM state persists in the browser. Server mail/graph data persists in `data/meridian.json`. Use **Reset demo** in the header to restore seed CRM data.

## Product notes

Triton seed data follows the public DebtMarket positioning: buyer + broker + marketplace, 14–45 day closes, asset classes (credit card, auto deficiency, medical, personal loans, telecom, fintech), and contacts at `portfolios@debtmarket.net` / +1 (561) 254-6608. It is **not** a collection workspace.

Aether is a placeholder institutional crypto desk so the second tenant is fully usable before the real firm is named.
