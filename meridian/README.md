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

Docker (persists `data/` on the `meridian-data` volume, mounted at `/app/data`):

```bash
cp .env.example .env
# set MERIDIAN_AUTH_SECRET to 32+ characters
docker compose up --build -d
```

Compose sets `MERIDIAN_SEED_DEMO=false` unless you override it, so a fresh volume does not load demo buyers and sellers. `npm run dev` still seeds demo data when that variable is unset.

Public health stub: `GET /api/health`

Demo CRM state in the browser persists separately from the server. Server mail, graph, and CRM rows persist in `data/meridian.json` and `data/meridian.db`. Use **Reset demo** in the header to restore the in-browser seed. To remove server-side demo companies, contacts, leads, and `crm_records` from a workspace:

```bash
MERIDIAN_SEED_DEMO=false npm run purge:demo -- --workspace triton
```

## Debt-desk CRM and CSV import

Contact and company records carry DebtMarket fields (lead type, asset class, buying states, NDA, do-not-email, HubSpot id, and outbound prospect segment/size). They are stored as JSON in `crm_records`, so no SQL migration is required. Open a record to view them, and use **Create** / **Edit** on Contacts and Companies. The contact list filters by lead type, asset class, state, NDA, and do-not-email.

**Contacts → Import** accepts three CSV shapes:

- Contacts — `First Name`, `Last Name`, `Email`, `Phone`, `Mobile`, `Job Title`, `Company Name`, `Company Domain`, `Website`, `Street`, `City`, `State`, `Zip`, `Country`, `LinkedIn`, `Lead Type`, `Stage`, `Lead Source`, `Owner`, `Created Date`, `Last Contacted`, `Asset Class Preference`, `Budget`, `Paper Age Preference`, `Coverage`, `Buying States`, `Collect or Litigate`, `NDA Signed`, `Closed Deal`, `Desk Replied`, `Email Status`, `Message Summary`, `Notes`, `Tags`, `HubSpot Record ID`, `Source`, plus optional `Reason` / `Removal Reason`
- Companies — `Company Name`, `Domain`, `Website`, `Phone`, `Industry`, `Company Type / Debt Roles`, `Description`, `Additional Preferences`, `Street`, `City`, `State`, `Zip`, `Country`, `Employees`, `Year Founded`, `Lead Status`, `Lifecycle`, `Owner`, `LinkedIn`, `Target Account`, `Close Date`, `Notes`, `HubSpot Record ID`, `Contact Count`
- Prospects — `segment`, `sub_type`, `company`, `website`, `hq_state`, `size_signal`, `why_fit`, `source_url`, `contact_name`, `title`, `linkedin`, `email`, `phone`, `confidence` (stored with lead source `outbound prospect`)

Contacts link to companies by domain, then by name. Re-runs match HubSpot Record ID, then email, then name plus company, and update the existing row. `--dry-run` prints counts and does not write. Rows that cannot be identified are skipped and listed with a reason.

```bash
npm run import:csv -- --workspace triton \
  --contacts ./contacts.csv \
  --companies ./companies.csv \
  --prospects ./prospects.csv

# Mark every row do-not-email, or invalid, and insert those addresses into suppressions:
npm run import:csv -- --workspace triton --contacts ./removed.csv --do-not-email
npm run import:csv -- --workspace triton --contacts ./bounced.csv --invalid-email
```

Inside Docker, copy the files into the data volume and run the same script:

```bash
docker compose exec meridian mkdir -p /app/data/import
docker compose cp ./contacts.csv meridian:/app/data/import/contacts.csv
docker compose cp ./companies.csv meridian:/app/data/import/companies.csv
docker compose exec meridian npm run import:csv -- \
  --workspace triton \
  --contacts /app/data/import/contacts.csv \
  --companies /app/data/import/companies.csv
```

Do not commit lead files. Bulk send skips suppressed addresses and any contact with `doNotEmail`, including test sends.

## Collections desk (sandbox)

The collections desk is a separate path from the buyer/seller CRM. It is for a third-party operation that only collects where the consumer lives in a state with no collector or debt-buyer license, plus Texas. Texas still requires the **$10,000** surety bond in Tex. Fin. Code § 392.101 and the time-barred rules in § 392.307. The eligibility table is editable at **State eligibility**. Uncertain states stay quarantined until counsel marks them eligible. This is not legal advice.

Outbound AI calls, SMS, email, Lob-style letters, limited-content voicemail, portal chat, and the payment handoff all pass the same gate: kill switch, daily cap, state eligibility, cease/dispute/bankruptcy/attorney holds, Reg F calling hours and the 7-in-7 / 7-day conversation cap, TCPA consent for AI voice on cell phones (FCC 24-17), internal DNC, and a reassigned-number scrub. The default scrub is "unknown", which blocks cell calls. The sandbox clear switch is not the FCC database. Transcripts are encrypted. Card numbers and SSNs are redacted and are not stored. Payment goes to `/pay/sandbox/[token]`, which does not collect a card.

```bash
npm run test:collections
```

The consumer portal is public at `/collect`. Lookup uses a reference number, the last four of the original account, and ZIP. Do not put an SSN in a URL. Test-mode payment records a receipt and does not collect a card. Collection reports are at `/w/triton/collections/reports` after a seat is signed in. Portfolio import on the desk accepts a column map, a first-sheet xlsx upload, or fixed-width rows. Full SSNs are encrypted and masked. This repository is public: do not load a real portfolio here. Move the app to a private repository first. What is done, stubbed, and still waiting on the owner is in `docs/COLLECTIONS-STATUS.md`.

Put counsel-reviewed Markdown templates in `templates/collections/` and use **Sync templates**. Nothing in that folder is sent until `counselReviewed: true`. The public repo must stay free of real debtor files.

## Environment

Copy `.env.example` to `.env.local` (dev) or `.env` (Compose). Empty values are fine until you use that feature.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MERIDIAN_AUTH_SECRET` | Production | Session signing secret, 32+ characters |
| `MERIDIAN_SECRET_KEY` | Production if you store BYOK secrets | Encryption key for provider secrets |
| `MERIDIAN_SEED_DEMO` | No | `false` disables `seedCrmRecords` and `seedDemoLeads`. Unset/`true` seeds demo data. Compose defaults to `false` |
| `MERIDIAN_CHANNEL_DELIVER` | No | `sandbox` records collection attempts locally. `live` is refused |
| `MERIDIAN_PUBLIC_URL` | Recommended | Public origin for unsubscribe and tracking links |
| `NEXT_PUBLIC_APP_URL` | Recommended | Same origin for the client |
| `RESEND_API_KEY` | To send as `portfolios@debtmarket.net` | Resend |
| `AGENTMAIL_API_KEY` | Alternate sender | AgentMail |
| `AGENTMAIL_INBOX_TRITON` | No | Triton AgentMail inbox |
| `AGENTMAIL_INBOX_AETHER` | No | Aether AgentMail inbox |
| `AETHER_FROM_EMAIL` | No | Aether From address |
| `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOXES` | For Office 365 sync | Microsoft Graph app-only |
| `OPENAI_BASE_URL` or `OLLAMA_BASE_URL`, `OPENAI_API_KEY`, `MERIDIAN_MODEL`, `MERIDIAN_FAST_MODEL`, `MERIDIAN_EMBED_MODEL` | For free-form model answers | OpenAI-compatible endpoint |
| `SERP_PROVIDER_URL`, `SERP_PROVIDER_KEY`, `SERP_PROVIDER_NAME` | For live rank tracking | SERP provider |
| `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER` | To sell seats | Polar |

`MERIDIAN_AUTH_SECRET` is the one production boot will not function correctly without. Mail, Graph, model, SERP, and Polar keys are required only for those features.

## Product notes

Triton seed data follows the public DebtMarket positioning: buyer + broker + marketplace, 14–45 day closes, asset classes (credit card, auto deficiency, medical, personal loans, telecom, fintech), and contacts at `portfolios@debtmarket.net` / +1 (561) 254-6608. It is **not** a collection workspace.

Aether is a placeholder institutional crypto desk so the second tenant is fully usable before the real firm is named.
