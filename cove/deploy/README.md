# Self-hosting Cove

Everything in this stack is open source. No managed platform, no vendor account
needed to stand it up and click through it.

## Quick start

```bash
cd cove
docker compose -f deploy/docker-compose.yml up -d --build
open http://localhost:8080
```

That runs the Next.js app alone, which is all you need to exercise the
collections floor, the liquidation tracker, portfolio import, staffing, QA, and
the TF Recovery consumer portal at `/pay`.

Without Docker:

```bash
npm install
npm run build
npm start        # http://localhost:3000
```

## Profiles

The compose file keeps the heavy pieces behind profiles so the default `up` is
fast.

| Profile | Brings up | When you need it |
| --- | --- | --- |
| *(default)* | `app` | Always |
| `edge` | Caddy with automatic TLS | Putting the consumer portal on a real domain |
| `data` | Postgres 16 | When state moves out of the browser into a server |
| `voice` | Asterisk 20 | Real SIP calls |

```bash
COVE_DOMAIN=pay.example.com docker compose -f deploy/docker-compose.yml --profile edge up -d
docker compose -f deploy/docker-compose.yml --profile voice up -d
```

## The telephony caveat that bites everyone

Asterisk runs with `network_mode: host`. This is not a preference. Docker's
bridge networking puts NAT between Asterisk and the world, and SIP carries IP
addresses inside the signalling body — so bridged Asterisk gives you one-way
audio, failed registrations, and codec negotiation timeouts that are miserable
to debug.

Two more things that follow from that:

- Asterisk needs the RTP range (10000–20000/udp) reachable through the host
  firewall, plus 5060/udp for signalling.
- It needs consistent CPU. RTP packetization is sub-millisecond sensitive, so
  burstable instances (AWS `t3`, GCP `e2`, DigitalOcean Basic droplets) produce
  audible choppiness under load. Use compute-optimized or dedicated-CPU hosts.

Because of all of this, the honest recommendation for production outbound is to
run the dialer on its own box, not in this compose file. Compose is right for
the app; a dedicated host is right for telephony.

## Choosing the dialer

**VICIdial** (AGPLv2) is the only mature open-source platform built for outbound
contact centers. Predictive and progressive pacing, campaigns, lead lists, agent
screens, recording, DNC, and clustering all exist on day one. The web UI looks
like 2009 and it wants Rocky Linux or AlmaLinux on bare-ish metal, but it works
and roughly 14,000 installations prove it.

**Asterisk + ARI** (the `voice` profile here) is the right base when the AI voice
agent places most of the calls and humans only take warm transfers. You get a
REST interface you can drive from TypeScript and no PHP/Perl application layer
to work around — at the cost of building campaigns, pacing, and agent state
yourself.

The configs in `deploy/asterisk/` are the second path: a carrier trunk, WebRTC
agent endpoints so remote 1099 collectors need only a browser, mandatory
`MixMonitor` recording on every leg, and a dialplan that refuses any destination
the application did not pre-clear.

Replace every `CHANGEME` before dialing anything real.

## What is deliberately not here

- **Card data.** The portal collects it and hands it to a PCI-DSS Level 1
  processor. Nothing about card capture should ever land in this repo or on
  your host. That is the entire reason to use a processor's hosted fields or
  tokenization iframe in production.
- **A database.** State lives in the browser today. The `data` profile is there
  for when you move it server-side; the Zustand store in `src/lib/store.ts` is
  the seam where that swap happens.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `COVE_PORT` | `8080` | Host port for the app |
| `COVE_PUBLIC_ORIGIN` | `http://localhost:8080` | Origin used when rendering pay links into SMS |
| `COVE_DOMAIN` | `localhost` | Domain Caddy issues a certificate for |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `cove` | Database credentials |
