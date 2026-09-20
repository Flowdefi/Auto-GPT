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

AI is an in-app **CTO** with registered tools over CRM, leads, Outlook, SEO, and mail. It grounds answers in hybrid RAG (lexical + inverted index + hashed/remote embeddings). Without a model endpoint it uses a deterministic planner that still executes real tools. Point `OPENAI_BASE_URL` / `OLLAMA_BASE_URL` plus `MERIDIAN_MODEL` at Ollama, llama.cpp, vLLM, or any OpenAI-compatible API to enable free-form reasoning. Default local stack: Qwen2.5 14B (reasoner), Llama 3.2 3B (router), nomic-embed-text (embeddings).

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

A proof campaign already landed at `ayflow@pm.me` from the Triton AgentMail inbox. Seed CRM addresses stay locked. Opens, clicks, unsubscribes, bounces, and complaints write into the database. Sends are paced at 400ms, A/B subjects are hashed by recipient, and a 72-hour frequency cap (3) is enforced. The composer live-scores spam heuristics and checks SPF / DKIM / DMARC on the sending domain.

## Revenue ops

- **Leads** — fit + intent scoring, named-account then round-robin routing, SLA clocks, accept/reject, buyer and seller motions
- **Automations** — event workflows (`lead.created`, `email.received`, `sla.breached`, `form.submitted`)
- **Website forms** — `GET /api/forms/embed.js` on www.debtmarket.net posts to `POST /api/forms/submit` and creates a scored lead
- **Office 365** — app-only Graph delta sync, auto-association by email then company domain
- **Enrichment** — public site metadata, schema.org, DNS/MX, socials, tech fingerprints, inferred email pattern

## SEO suite

Crawl, weighted technical audit, keyword research, content briefs, and on-page optimizer. Position tracking stays empty until `SERP_PROVIDER_URL` + `SERP_PROVIDER_KEY` are set — the app will not invent ranks.

Without a provider key the composer still works and returns a clear error instead of silently faking delivery.

## Database + RAG graph

First API call creates `data/meridian.json` and `data/meridian.db` (SQLite):

- Relational CRM snapshot (companies, contacts, deals, inventory, tickets, CMS, SEO, …)
- Email lists, members, templates, campaigns, outbound messages, suppressions, events
- Knowledge graph nodes/edges
- RAG chunks with **FTS5 + lexical** retrieval and neighbor expansion

Schema: [`src/server/schema.sql`](src/server/schema.sql). Explore it in **Graph / RAG**. Public health is a stub at `GET /api/health`. Snapshot and RAG require a seated session or `mk_live_` key.

## Run

```bash
cd meridian
npm install
cp .env.example .env.local   # add AGENTMAIL_API_KEY or RESEND_API_KEY to send from the UI
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account, then buy the **$275 lifetime seat** (Polar) or redeem a minted key:

```bash
npm run license:mint -- you@example.com
```

Workspaces stay locked until a seat is attached. Extra operators each pay once. After purchase, mint `mk_live_` API keys on `/billing` and optionally store BYOK provider keys (Ollama, vLLM, Resend, AgentMail) encrypted per seat.

Production requires `MERIDIAN_AUTH_SECRET` (32+ characters). Polar webhook: `POST /api/billing/webhook`.

```bash
npm run build && npm run start
```

Docker (persists `data/`):

```bash
docker compose up --build
```

Public health stub: `GET /api/health`

Demo CRM state persists in the browser. Server mail/graph data persists in `data/meridian.json`. Use **Reset demo** in the header to restore seed CRM data.

## Product notes

Triton seed data follows the public DebtMarket positioning: buyer + broker + marketplace, 14–45 day closes, asset classes (credit card, auto deficiency, medical, personal loans, telecom, fintech), and contacts at `portfolios@debtmarket.net` / +1 (561) 254-6608. It is **not** a collection workspace.

Aether is a placeholder institutional crypto desk so the second tenant is fully usable before the real firm is named.
