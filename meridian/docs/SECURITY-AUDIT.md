# Security checks

Run on 2026-11-05 against the Meridian app. This is not a penetration test.

## Dependency audit

`npm audit` reported 13 findings: 1 critical, 4 high, 8 moderate.

| Package | Severity | What we did |
| --- | --- | --- |
| next | critical | The vulnerable range includes the installed 15.x release and the published fix is past 16.3 preview. This change does not jump to a preview. Upgrade Next when a stable release is outside that range, then rebuild. |
| sharp | high | A librsvg issue in a dependency. Do not process untrusted images on the public site. |
| postcss | high | Build-time CSS tooling. Upgrade when a patched 8.x is the lockfile default. |
| brace-expansion | high | Transitive. Avoid passing untrusted brace patterns to it. |
| source-map-js | high | Transitive. Do not feed it untrusted source maps at runtime. |

`npm audit fix` was not applied. A blanket fix would not clear the Next finding without leaving 15.x.

## Secret scan

`npm run scan:secrets` found no live key patterns (`AKIA`, `sk_live_`, private key blocks, long `mk_live_` tokens).

## Application checks

- API routes must call `requireSeat`, `requireAccount`, or `seatFromRequest`, or sit on the public allowlist in `hardening.test.ts`.
- Cookie-authenticated writes check the `Origin` host.
- Portfolio uploads are size-capped and rejected when the sample contains a script or a spreadsheet that is not a zip.
- Client logins are bound to one seller. A client cannot place or see another seller's accounts.
- Logs redact Social Security-shaped numbers, card-shaped numbers, and email addresses.
- `GET /api/metrics` requires a seat and returns counts and alert names, not account rows.
