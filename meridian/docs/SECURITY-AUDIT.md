# Security checks

Re-run on 2026-11-05 after the dependency upgrade. This is not a penetration test.

## Dependency audit

`npm audit --audit-level=critical` exits 0. Current counts: 0 critical, 0 high, 8 moderate.

| Package | Was | Now | What we did |
| --- | --- | --- | --- |
| next | 15.5.25, critical image-optimization RCE (GHSA-2464-fhr4-w9xw, fixed in 15.5.28) plus later cache issues | 15.5.29 | Stayed on the 15 maintenance line. 15.5.29 is the stable release that includes the October 14, 2026 fixes (15.5.28) and the November 3, 2026 fixes. We did not jump to Next 16. |
| sharp | 0.35.4, high librsvg issue | 0.35.5 | Direct dependency and an `overrides` pin. This is also the workaround named in the Next.js image advisory. |
| postcss | 8.4.31 nested in Next, high | 8.5.32 | `overrides` forces one copy. |
| brace-expansion | 1.1.18, high | 1.1.21 | `overrides` pin on the 1.x line eslint still uses. |
| source-map-js | 1.2.1, high | 1.2.2 | `overrides` pin. |

Eight moderate findings remain in the lint and file-tool chain (`minimatch`, `glob`, `rimraf`, and the TypeScript ESLint packages that depend on them). They are development-time denial-of-service issues, not a runtime remote-code path in the desk. `npm audit fix` was not applied to them because it would move the linter's dependency tree. CI runs `npm audit --audit-level=critical` and fails the job if a critical comes back.

## Temporary controls that stay even after the upgrade

- Cache Components and `use cache` are not enabled. Do not turn them on without reading the current Next.js advisories.
- SVG optimization is off (`images.dangerouslyAllowSVG: false`).
- `/api`, `/collect`, and `/w` send `Cache-Control: no-store` so a shared cache is not the place account pages live.
- A reverse proxy in front of this app should not reuse one backend connection for pipelined HTTP/1.1 requests from different clients. If the host terminates TLS, keep HTTP/2 or HTTP/3 to the app, or disable request pipelining on the proxy.
- The public site does not serve user-uploaded images through the Next.js image optimizer.

## Secret scan

`npm run scan:secrets` found no live key patterns.

## Application checks

- API routes must call `requireSeat`, `requireAccount`, or `seatFromRequest`, or sit on the public allowlist in `hardening.test.ts`.
- Cookie-authenticated writes check the `Origin` host.
- Portfolio uploads are size-capped and rejected when the sample contains a script or a spreadsheet that is not a zip.
- Client logins are bound to one seller.
- Logs redact Social Security-shaped numbers, card-shaped numbers, and email addresses.
- `GET /api/metrics` requires a seat and returns counts and alert names, not account rows.
- Voice webhooks require a Twilio or Telnyx signature, or the sandbox header. Live dialing stays off unless `MERIDIAN_VOICE_LIVE=enabled` and `MERIDIAN_CHANNEL_DELIVER=live`.
