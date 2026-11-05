# Production deploy

This repository is public. Do not deploy it with a real portfolio until it is private, counsel has signed, and the Texas bond is on file.

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
