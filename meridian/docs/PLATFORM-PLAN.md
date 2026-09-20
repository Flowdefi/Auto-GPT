# Meridian platform plan — SEMrush-class SEO, HubSpot/Salesforce-class revenue ops

Everything here is built from open-source building blocks or implemented directly in this repo. No paid SaaS is required to run it. Where a commercial data source is the only way to get a number (SERP positions, backlink index, keyword volume), the code ships a provider-agnostic adapter and degrades to a documented local estimate rather than inventing data.

## Reference feature sets we are matching

### Semrush (Pro / Enterprise)
Site Intelligence crawling with JS rendering, technical audit with weighted issue severity, Position Tracking (daily, per-device, per-location, competitors, SERP features), Keyword Magic (difficulty, intent, volume, related/question terms), content audit and SEO briefs, competitor and content gap analysis, backlink analytics, forecasting.

### HubSpot Marketing Hub Enterprise
Up to 1,000 workflows, omni-channel automation, multiple scoring models (fit + intent) with recommendations, lists/segmentation, campaign reporting and multi-touch attribution, SEO recommendations + SEO analytics, form automation, email frequency caps and approvals.

### HubSpot Sales Hub Professional
Prospecting workspace with lead stages (New → Attempting → Connected → Qualified), sequences, custom deal pipelines with stage automation, playbooks, lead rotation, task automation, forecasting, quotes.

### Salesforce lead management
Capture → enrich → score (fit + intent) → route (named account → segment → territory → round-robin with fallback queue) → accept/reject with reasons → convert to opportunity on evidence → inspect. Statuses: New, MQL, Routed/SAL, Accepted, SQL, Nurture, Rejected, Converted. SLA clocks on assignment and first touch, with escalation.

## Open-source projects we draw on

| Need | Project | How we use it |
| --- | --- | --- |
| SEO crawler | Scouter, LibreCrawl, SEOnaut (Screaming-Frog-class, self-hosted) | Crawl model: BFS from seed, robots.txt + nofollow honoring, depth cap, redirect chains, duplicate detection, internal PageRank, orphan detection |
| Rank tracking | SerpBear | Provider-agnostic SERP adapter, keyword/domain store, position history, change alerts |
| Page audits | Lighthouse / Unlighthouse | Audit categories and issue naming; we implement the static subset that does not need a headless browser |
| Mail sync | m365-graph-mail, microsoft-graph-client | App-only client-credentials flow, `messages/delta` incremental sync, opaque deltaLink persistence, 410 resync |
| Spam scoring | SpamAssassin rule corpus | Heuristic rule set for subject/body/link/ratio checks before a send |
| Local LLM | Ollama / llama.cpp / vLLM | OpenAI-compatible `/v1/chat/completions` endpoint so the in-app AI runs fully self-hosted |
| Text analysis | Flesch-Kincaid, TF-IDF, RAKE | Readability, keyword density, content briefs — implemented directly, no dependency |

## What ships in this phase

1. **Server-side CRM of record.** Contacts, companies, and leads move from browser-only state into the persisted store so mail, forms, enrichment, and automations can write to them.
2. **Revenue workflow engine.** Lifecycle states, fit/intent scoring, routing with fallback queue, SLA clocks, and event-driven automations for both buyer and seller motions.
3. **Website form capture.** Public CORS endpoint plus a drop-in embed script for `www.debtmarket.net` that creates a lead, contact, and company, runs enrichment, scores, routes, and enrolls automations.
4. **Office 365 inbox.** Microsoft Graph app-only sync, auto-association of every message to contact and company records by address and domain, with thread and activity capture.
5. **Enrichment.** Company and contact enrichment from public sources: site metadata, schema.org, sitemap, DNS/MX, mail provider, social links, tech fingerprints, inferred email pattern.
6. **SEO suite.** Crawler, weighted technical audit, keyword research with difficulty and intent, content optimizer/brief, position tracking store, and competitor gap.
7. **AI CTO.** An agent with a registered tool surface over the whole platform (root access), context-aware suggested prompts per page, content generation, and an audit log of every action it takes.
8. **Email blast revamp.** Segments, A/B subject testing, spam scoring, deliverability (SPF/DKIM/DMARC) checks, throttling and warmup, frequency caps, link/UTM handling, and engagement suppression.

## Non-negotiables carried forward

- Brand From stays `portfolios@debtmarket.net`; the app will not spoof a domain it cannot authenticate.
- Seed/demo CRM addresses are never mailed.
- Triton is a buyer/broker/marketplace, not a collection agency. No consumer contact language anywhere in generated content.
- Every AI action that mutates data is written to an audit log with the tool name and arguments.
