# Collections platform status

Meridian’s collections desk is a sandbox. This GitHub repository is public. Move the app to a private repository before any real portfolio, SSN, or account number is loaded. Sample identifiers use the 900 range and the name “Example”. Nothing below is legal advice. Rule values cite the section they implement and are marked for counsel where the reading is not settled.

Audit against the original collections brief and the two owner updates (collect only in no-license states plus Texas; sandbox voice AI for inbound and outbound).

| Item | Status | What is in the app |
| --- | --- | --- |
| Portfolio import: CSV, xlsx, fixed-width, column map, validation, dedupe, chain of title, original creditor, charge-off, Reg F itemization, last payment, import audit | Done | Desk file picker, JSON column map, and API. Audit stores counts only. |
| SOL by state | Partial | Texas (4 years, Civ. Prac. & Rem. Code § 16.004) and Georgia written contracts (6 years, O.C.G.A. § 9-3-24). Other states are blank for counsel. Accrual is last payment, else charge-off, and is flagged. |
| SSN, DOB, and account number encryption, mask, role-gated reveal, purge | Done | AES-256-GCM. Reveal is admin or compliance and is audit-logged without the value. Returned accounts can be purged. |
| Retention schedule for debtor files | Missing | Purge is manual. There is no automatic retention clock. |
| State eligibility limited to no-license states plus Texas, with citations | Done | 50 states and D.C. Uncertain license rows stay ineligible. Texas is the § 392.101 bond, not a license. |
| Quarantine ineligible accounts on import and block outreach and the portal | Done | Import sets status quarantined. The gate blocks outreach and portal payment. The desk shows the count. |
| Reg F validation notice and 1006.34(b)(5) end date | Partial | Text follows the Model Form B-1 structure in template LTR-001. The end date is computed. It is not the CFPB’s designed PDF. |
| Dispute and cease stop outreach | Done | Status changes close the gate. Acknowledgment templates can still be sent when approved. |
| 7-in-7, 7-day conversation wait, 8:00 a.m.–9:00 p.m. local time | Done | Enforced in the gate. Unknown ZIP blocks rather than guessing. |
| SMS and email consent and opt-out | Partial | Stored consent is required. STOP classification exists. A full carrier opt-out webhook is not connected. |
| Mini-Miranda, time-barred disclosure, bankruptcy, deceased, SCRA flags | Partial | Mini-Miranda is on the voice flow and drafts. Time-barred text is in templates. SCRA is a flag and a template, not a DMDC scrub. |
| Per-state rule table that is easy to edit | Done | State eligibility screen. |
| Every outbound message hits a compliance gate that logs the block | Done | Voice, SMS, email, letter, voicemail, portal chat, and templates. |
| Email and SMS sequences with provider adapters | Partial | Sandbox adapters record or block. Live delivery throws. There is no multi-step sequence runner. |
| Templates with required disclosures | Done | 50-item library. Sends stay off until an owner approves the template. Empty required merge fields block the send. |
| Inbound reply and STOP handling | Partial | Classifier and draft queue. Not a carrier webhook. |
| Visual workflow builder | Missing | Tasks are a list, not a canvas. |
| Collector task queue | Done | `/w/triton/collections/queue` lists import, dispute, hardship, and warm-transfer tasks. |
| AI agents: triage, classify, draft for approval, payment plans, risk flags | Partial | Rules classifier and drafts. A person must approve before email sends. Not a model. |
| Voice AI inbound and outbound in sandbox | Done | Desk call console: AI disclosure, recording notice and consent, right-party check, mini-Miranda, Reg F caps, warm transfer onto the queue, payment handoff to `/pay/sandbox/…`. No audio provider is dialed. |
| TCPA consent for AI voice on cells and reassigned-number hook | Partial | Cell outbound blocks without stored consent. Unknown scrub blocks unless the sandbox clear switch is on. That switch is not the FCC database. |
| Call recording, encrypted transcript, QA flags, kill switch, daily cap | Done | Transcripts are encrypted. Guardrails replace banned lines. Kill switch blocks outbound campaigns. |
| Consumer portal: lookup, itemization, validation download, dispute, plan, test payment | Done | `/collect`. Reference, last four, and ZIP. No SSN in the URL. Plan total cannot exceed the balance. Payment is a sandbox ledger entry. |
| PCI hosted processor | Partial | Sandbox page only. Stripe is an env slot, not a live charge. |
| ADA, privacy policy, required disclosures | Partial | Labels, contrast, and a draft privacy page. Not a WCAG audit or a counsel-approved policy. |
| Reports and CSV export | Partial | Recovery, disputes, blocked attempts, CSV. Collector performance and client remittance are thin. |
| Roles, MFA, database, audit, rate limit, health, tests, CI, Docker | Partial | Roles and optional TOTP. JSON plus SQLite. MFA is not forced until an account enrolls. No background worker. |
| FCRA / Metro 2 and a full GLBA program | Missing | Templates mention furnishing. No Metro 2 file is produced. |
| Letters via a print-and-mail API | Partial | Letter channel records a sandbox attempt. Lob is not called. |

## Owner still needs to provide

Counsel review of the state table, the template library, recording-consent states, SOL accrual, the validation-notice layout, and `/collect/privacy`. The Texas $10,000 Secretary of State bond before any Texas collection. A private repository. FCC Reassigned Numbers Database access. Written consent records. Owner-set settlement matrix values before an offer can be sent. Sandbox or production keys only after the repo is private: `TWILIO_*`, `TELNYX_API_KEY`, `VAPI_API_KEY`, `RETELL_API_KEY`, `LOB_API_KEY`, `STRIPE_SECRET_KEY`, `MERIDIAN_RND_API_URL`, and `MERIDIAN_AUTH_SECRET`.
