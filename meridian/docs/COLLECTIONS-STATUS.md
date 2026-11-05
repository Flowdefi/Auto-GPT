# Collections platform status

Meridian’s collections desk is a sandbox. This GitHub repository is public. Move the app to a private repository before any real portfolio, SSN, or account number is loaded. Sample identifiers in the demo use the 900 range and the name “Example Consumer”.

## Done

- Portfolio CSV import with a column-map field on the desk, a CSV/xlsx file picker, fixed-width rows, and first-sheet xlsx. Fields include seller, chain of title, original creditor, charge-off, Reg F itemization amounts, and last payment. Duplicate references are skipped. An audit row stores counts only, not row contents. Uploaded files are not written into the repository.
- SSN, date of birth, and full account number are encrypted at rest and omitted from API lists. The UI shows a mask. Reveal is limited to admin and compliance roles and writes an audit event that does not contain the value. Returned accounts can have that ciphertext purged.
- State eligibility table (50 states and D.C.) with citations. Ineligible consumer states are quarantined and can be returned to the seller. The compliance gate blocks outreach and the payment portal for those accounts.
- The collections template library (letters, calls, SMS, email, and the voice-AI guardrail file) is seeded from `templates/collections`. Sends stay off until an owner approves a template. The validation end date is the date 30 days after assumed receipt, and assumed receipt is five federal business days after sending (12 CFR § 1006.34(b)(5)). Dispute status stops outreach. Call frequency, calling hours, cease, bankruptcy, attorney, deceased, and military holds are on the same gate. Mini-Miranda is on the voice flow and on drafted replies.
- SMS, email, letter, limited-content voicemail, and portal chat adapters record a sandbox attempt or a block. Live delivery is refused.
- Inbound text is classified (dispute, cease, hardship, promise, bankruptcy, attorney) and a reply is drafted for human approval. Approval sends only if the gate still allows it.
- Collector and compliance tasks are opened on import and on dispute.
- Consumer portal at `/collect`: reference, last four, and ZIP. The SSN is never in the URL. The account page shows itemization, a validation download when one was issued, dispute submission, and a test-mode payment that records a receipt and does not collect a card. `/collect/privacy` is a draft notice marked for counsel, not an approved privacy policy.
- Reports: recovery by portfolio, disputes, blocked attempts, CSV download.
- Roles: owner defaults to admin, other seats default to collector, and an admin can assign admin, manager, collector, compliance, or read-only. Read-only cannot change records. Authenticator enrollment is `POST /api/auth/mfa`; once enabled, login requires the code.
- Tests cover the gate, import quarantine, encryption masking, SOL, voice right-party flow, and TOTP. `npx tsc --noEmit` and `npm run test:collections` are the checks. GitHub workflow `.github/workflows/meridian.yml` runs them.

## Stubbed or not done

- No live Twilio, Telnyx, Vapi, Retell, Lob, SendGrid, or Stripe charge. The payment button is a sandbox ledger entry.
- The voice “AI” is a scripted compliance flow with a rules summary, not a realtime speech model.
- Inbound classification is rules, not a model. Drafts still require approval.
- Workflow is a task queue, not a visual builder.
- SOL dates are calculated only for Texas (four years, Civ. Prac. & Rem. Code § 16.004) and Georgia (six years written, O.C.G.A. § 9-3-24). Every other state is left blank for counsel. Accrual uses last payment, else charge-off, and is flagged for review.
- Validation text is not the CFPB’s designed model form.
- Metro 2, a full GLBA program, and background workers are not built. PII purge is a manual action for returned accounts.
- MFA is enroll-and-require-at-login. It is not enforced for every existing account until that account enrolls.

## Owner still needs to provide

Counsel review of the state table, recording-consent states, SOL accrual, and the validation notice. The Texas $10,000 Secretary of State bond before any Texas collection. A private repository. FCC Reassigned Numbers Database access. Written consent records. Sandbox keys only after the repo is private: `TWILIO_*`, `TELNYX_API_KEY`, `VAPI_API_KEY`, `RETELL_API_KEY`, `LOB_API_KEY`, `STRIPE_SECRET_KEY`, `MERIDIAN_RND_API_URL`, and `MERIDIAN_AUTH_SECRET`.
