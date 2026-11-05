# Collections platform status

Meridian’s collections desk is a sandbox. This GitHub repository is public. Move the app to a private repository before any real portfolio, SSN, or account number is loaded. Sample identifiers use the 900 range and the name “Example”. Nothing below is legal advice. Rule values cite the section they implement and are marked for counsel where the reading is not settled.

Audit against the original collections brief and the two owner updates (collect only in no-license states plus Texas; sandbox voice AI for inbound and outbound).

| Item | Status | What is in the app |
| --- | --- | --- |
| Portfolio import: CSV, xlsx, fixed-width, column map, validation, dedupe, chain of title, original creditor, charge-off, Reg F itemization, last payment, import audit | Done | Desk file picker, JSON column map, and API. Audit stores counts only. |
| SOL by state | Partial | Editable table at `/w/triton/settings/sol`. Texas and Georgia start filled. Every other state stays blank until counsel enters a period. Accrual is last payment, else charge-off. |
| SSN, DOB, and account number encryption, mask, role-gated reveal, purge | Done | AES-256-GCM. Reveal is admin or compliance and is audit-logged without the value. Returned accounts can be purged. |
| Retention schedule for debtor files | Done | `npm run jobs:run` purges stored identifiers after MERIDIAN_PII_RETENTION_DAYS (default 1095, 12 CFR § 1006.100, counsel review). The audit counts accounts and does not log values. |
| State eligibility limited to no-license states plus Texas, with citations | Done | 50 states and D.C. Uncertain license rows stay ineligible. Texas is the § 392.101 bond, not a license. |
| Quarantine ineligible accounts on import and block outreach and the portal | Done | Import sets status quarantined. The gate blocks outreach and portal payment. The desk shows the count. |
| Reg F validation notice and 1006.34(b)(5) end date | Partial | The portal downloads a one-page PDF in Model Form B-1 section order, and the end date is computed. It is not the CFPB's designed form file. Counsel must compare it before mailing. |
| Dispute and cease stop outreach | Done | Status changes close the gate. Acknowledgment templates can still be sent when approved. |
| 7-in-7, 7-day conversation wait, 8:00 a.m.–9:00 p.m. local time | Done | Enforced in the gate. Unknown ZIP blocks rather than guessing. |
| SMS and email consent and opt-out | Done | Stored consent is required. `/api/webhooks/channels` records carrier STOP/HELP and email bounce or unsubscribe. Sandbox calls send `x-meridian-sandbox: 1`. Live calls need the provider secret. |
| Mini-Miranda, time-barred disclosure, bankruptcy, deceased, SCRA flags | Partial | Mini-Miranda is on the voice flow and drafts. Time-barred text is in templates. SCRA is a flag and a template, not a DMDC scrub. |
| Per-state rule table that is easy to edit | Done | State eligibility screen. |
| Every outbound message hits a compliance gate that logs the block | Done | Voice, SMS, email, letter, voicemail, portal chat, and templates. |
| Email and SMS sequences with provider adapters | Done | Sequences are scheduled jobs. Twilio, Telnyx, SendGrid, Postmark, Lob, and Stripe adapters stay in sandbox unless MERIDIAN_CHANNEL_DELIVER=live and that provider is selected. |
| Templates with required disclosures | Done | 50-item library. Sends stay off until an owner approves the template. Empty required merge fields block the send. |
| Inbound reply and STOP handling | Done | Classifier and draft queue, plus the carrier STOP/HELP webhook. |
| Visual workflow builder | Done | `/w/triton/collections/workflows` builds email, SMS, letter, and voice steps. The job runner sends each step only through the compliance gate. |
| Collector task queue | Done | `/w/triton/collections/queue` lists import, dispute, hardship, and warm-transfer tasks. |
| AI agents: triage, classify, draft for approval, payment plans, risk flags | Partial | Rules classifier and drafts. A person must approve before email sends. Not a model. |
| Voice AI inbound and outbound in sandbox | Done | Desk call console: AI disclosure, recording notice and consent, right-party check, mini-Miranda, Reg F caps, warm transfer onto the queue, payment handoff to `/pay/sandbox/…`. No audio provider is dialed. |
| TCPA consent for AI voice on cells and reassigned-number hook | Partial | Cell outbound blocks without stored consent. Unknown scrub blocks unless the sandbox clear switch is on. That switch is not the FCC database. |
| Call recording, encrypted transcript, QA flags, kill switch, daily cap | Done | Transcripts are encrypted. Guardrails replace banned lines. Kill switch blocks outbound campaigns. |
| Consumer portal: lookup, itemization, validation download, dispute, plan, test payment | Done | `/collect`. Reference, last four, and ZIP. No SSN in the URL. Plan total cannot exceed the balance. Payment is a sandbox ledger entry. |
| PCI hosted processor | Partial | Default checkout is the sandbox page. Stripe Checkout is implemented behind MERIDIAN_PAYMENTS_PROVIDER=stripe and live delivery, and the webhook reconciles the provider id. No card data is stored here. |
| ADA, privacy policy, required disclosures | Partial | Labels, contrast, and a draft privacy page. Not a WCAG audit or a counsel-approved policy. |
| Reports and CSV export | Done | Recovery, client remittance statement, collector performance, disputes, blocked attempts, and CSV. Fee percent defaults to 0. |
| Roles, MFA, database, audit, rate limit, health, tests, CI, Docker | Partial | Admin and compliance must enroll MFA before reveal, eligibility edits, template approval, settlement edits, role changes, and the limitations table. Collectors are not forced. JSON plus SQLite. Jobs run from `npm run jobs:run` or the sequence screen, not a always-on worker process. |
| FCRA / Metro 2 and a full GLBA program | Missing | Templates mention furnishing. No Metro 2 file is produced. |
| Letters via a print-and-mail API | Partial | Lob's letter API is implemented behind MERIDIAN_LETTER_PROVIDER=lob and live delivery. The default records a sandbox letter and accepts a sandbox Lob webhook. |

## Owner still needs to provide

Counsel review of the state table, the template library, recording-consent states, SOL accrual, the validation-notice PDF, the three-year retention clock, and `/collect/privacy`. Periods for every state except Texas and Georgia. The Texas $10,000 Secretary of State bond before any Texas collection. A private repository. FCC Reassigned Numbers Database access. Written consent records. An authenticator enrolled for every admin and compliance account. Owner-set settlement matrix values before an offer can be sent. The agency fee percent if it is not zero. Sandbox or production keys only after the repo is private: `TWILIO_*`, `TELNYX_*`, `SENDGRID_*`, `POSTMARK_*`, `VAPI_API_KEY`, `RETELL_API_KEY`, `LOB_API_KEY`, `LOB_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MERIDIAN_RND_API_URL`, and `MERIDIAN_AUTH_SECRET`.
