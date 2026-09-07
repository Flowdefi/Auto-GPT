# Cove

US consumer **collections floor** for inventory in states that do not require a collection-agency license. Built for daily computer use (warm parchment + teal) and as an iOS / Android PWA.

This is **not** Meridian (Triton’s brokerage CRM). Cove is the collector product: clock-in, live agent pool, authenticated voice / SMS / email agents, payments, skip trace, a debtor CRM with a centered timeline, and an autonomous recovery bot.

## Compliance posture

- Outbound **hard-gates** states that require a collection license (and treats TX bond / FL registration as not license-free).
- Federal **FDCPA mini-Miranda**, **TCPA consent**, **8am–9pm debtor-local** calling, DNC, cease, time-barred, and validation-before-demand are enforced in the dialer and bot.
- The state map is a public-source snapshot (2026) and **not legal advice**. Local city licenses still apply. Review with counsel before production.

Open-state allowlist used by the gate: GA, KS, KY, MS, MO, MT, NH, OH, OK, SC, SD, UT, VT, VA.

## Run

```bash
cd cove
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001), clock in, then use Floor → Dialer → Live call → Debtor CRM.

## Mobile

Add to Home Screen (iOS/Android). `capacitor.config.ts` is ready for `npx cap add ios` / `android`.
