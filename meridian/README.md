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

## Run

```bash
cd meridian
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose a workspace.

Demo state persists in the browser (`localStorage`). Use **Reset demo** in the header to restore seed data.

## Product notes

Triton seed data follows the public DebtMarket positioning: buyer + broker + marketplace, 14–45 day closes, asset classes (credit card, auto deficiency, medical, personal loans, telecom, fintech), and contacts at `portfolios@debtmarket.net` / +1 (561) 254-6608. It is **not** a collection workspace.

Aether is a placeholder institutional crypto desk so the second tenant is fully usable before the real firm is named.
