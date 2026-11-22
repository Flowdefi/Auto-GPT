# Production deploy

This repository is public. Do not deploy it with a real portfolio until it is private, counsel has signed, and the Texas bond is on file.

The apex site `https://debtmarket.net` stays the institutional site. It says Triton is not a collection agency. Collections copy is only on `https://collect.debtmarket.net`.

## Dual host

One app process. Two public names. Cloudflare Access stays on the admin name only.

| Host | Who | Access | What it serves |
| --- | --- | --- | --- |
| `https://crm.debtmarket.net` | Operators | Cloudflare Access, existing tunnel `meridian-crm` | `/w/*`, login, billing, admin APIs |
| `https://collect.debtmarket.net` | Consumers | No Access application | `/agency`, `/collect`, `/pay`, dispute, public webhooks |

`/` on the collect host redirects to `/agency`. `/w/*` on the collect host redirects to crm. Consumer pages on crm redirect to collect. Admin API calls on the collect host return 421 instead of following a POST redirect.

The container listens on port **3000** (`next start --hostname 0.0.0.0 --port 3000`). Compose publishes `${MERIDIAN_BIND_PORT:-3000}` to that port. Keep the healthy `meridian-crm` ingress on `http://127.0.0.1:3000`. Add `collect.debtmarket.net` as a second hostname to the **same** service. Do not put that hostname in the Access application. An example ingress is `deploy/cloudflared.example.yml`.

### Env checklist for the first cut

Set these on the host. Do not commit the password or the auth secret.

```bash
MERIDIAN_AUTH_SECRET=          # 32+ characters, already required
MERIDIAN_SECRET_KEY=           # same store as the auth secret
MERIDIAN_PUBLIC_URL=https://collect.debtmarket.net
MERIDIAN_ADMIN_URL=https://crm.debtmarket.net
NEXT_PUBLIC_APP_URL=https://collect.debtmarket.net
MERIDIAN_OWNER_EMAIL=portfolios@debtmarket.net
MERIDIAN_OWNER_PASSWORD=       # host env only, 12+ characters, never in git
MERIDIAN_AGENCY_NAME=          # blank keeps {{agency_name}}; or DebtMarket Collections until counsel signs
MERIDIAN_AGENCY_DOMAIN=collect.debtmarket.net
MERIDIAN_CHANNEL_DELIVER=sandbox
MERIDIAN_COLLECTIONS_DEMO=false
MERIDIAN_VOICE_LIVE=
MERIDIAN_METRO2_EXPORT=disabled
MERIDIAN_BIND_PORT=3000
```

Startup creates the owner seat for `portfolios@debtmarket.net` when the password is set. The password must be 12 to 128 characters. A shorter value is ignored, the seat is not created, and the desk still starts. It does not reset the password on later boots, and it does not enroll MFA. Admin and compliance still need MFA before privileged actions.

`MERIDIAN_CHANNEL_DELIVER=sandbox` means no live SMS, email, voice, or charges. The later flip, after counsel and the provider keys, is one line plus the provider selectors:

```bash
MERIDIAN_CHANNEL_DELIVER=live
```

Leave `MERIDIAN_SMS_PROVIDER`, `MERIDIAN_EMAIL_PROVIDER`, `MERIDIAN_LETTER_PROVIDER`, `MERIDIAN_PAYMENTS_PROVIDER`, and `MERIDIAN_VOICE_LIVE` unset or `sandbox` until that day.

## Docker

## Docker

From `meridian/`:

```bash
docker compose up --build -d
```

The `meridian` service serves the site. The `jobs` service runs `npm run jobs:worker` against the same data volume. Sandbox delivery is the default.

## Environment

Set these before a live host. Leave provider values at `sandbox` until the go-live list is done.

- `MERIDIAN_AUTH_SECRET` at least 32 characters
- `MERIDIAN_PUBLIC_URL`
- `MERIDIAN_CHANNEL_DELIVER=sandbox` until a provider is approved
- `MERIDIAN_SMS_PROVIDER`, `MERIDIAN_EMAIL_PROVIDER`, `MERIDIAN_LETTER_PROVIDER`, `MERIDIAN_PAYMENTS_PROVIDER`, `MERIDIAN_ACH_PROVIDER`
- `MERIDIAN_RND_PROVIDER`, `MERIDIAN_SCRA_PROVIDER`
- `MERIDIAN_METRO2_EXPORT=disabled`
- `MERIDIAN_PII_RETENTION_DAYS`
- `MERIDIAN_AGENCY_NAME` when counsel approves the public site
- `MERIDIAN_ALERT_OPEN_COMPLAINTS`
- Provider keys only in the host secret store

`GET /api/health` stays public and does not list accounts. `GET /api/metrics` requires a seat and returns counts plus alert names. An alert name means a person should look. It does not page anyone by itself.

Logs are JSON lines. Social Security numbers, card numbers, and email addresses are redacted. Do not turn on request-body logging.

## Go-live checklist

- The repository is private.
- Counsel has signed the state table, templates, Spanish copy, recording-consent table, validation PDF, privacy page, public site, and Safeguards pack.
- A Qualified Individual is named.
- The Texas $10,000 Secretary of State bond is filed and the filing is recorded. Tex. Fin. Code § 392.101.
- Limitation periods for states other than Texas and Georgia are entered by counsel or left blank.
- Every admin and compliance user has MFA.
- Settlement values are no longer defaults.
- Metro 2 stays disabled until owner and compliance both approve and the CRA confirms the file layout.
- A backup has been restored once onto a spare host.
- `npm run scan:secrets` is clean.
- `npm audit` has been read. High findings are either upgraded or written down with a reason.
