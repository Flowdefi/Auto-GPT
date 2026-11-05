# Collections desk status

This is not a finished collections agency. It is the sandbox gate, state table, and voice flow the later platform work plugs into. The GitHub repo is public. Do not load a real portfolio until the app lives in a private repository.

## Done

- State eligibility table for all 50 states and D.C., with citations and a counsel-review flag. Eligible set is states where this review found no collector or debt-buyer license, plus Texas. Texas is modeled as a $10,000 Secretary of State surety bond under Tex. Fin. Code § 392.101, not a license, plus § 392.307 time-barred debt rules. Uncertain states stay quarantined. Owners can flip a state in **State eligibility**.
- Portfolio CSV import tags each account with the consumer's state, quarantines ineligible states, and can mark those rows returned to the seller. SSN-shaped columns and values are rejected and not stored.
- One compliance gate for outbound AI voice, inbound voice, SMS, email, letters, limited-content voicemail, portal chat, and the payment handoff. It enforces the kill switch, daily cap, state eligibility, cease and similar holds, 8:00 a.m.–9:00 p.m. local time, the 7-in-7 and post-conversation waits, cell-phone consent for AI voice, internal DNC, and a reassigned-number result.
- Sandbox voice agent: AI disclosure, recording announcement, all-party consent stop, right-party check with two non-SSN identifiers before any debt disclosure, mini-Miranda, payment handoff that never stores a card, plans inside owner authority, dispute / hardship / bankruptcy / attorney / cease updates, warm transfer, encrypted transcript, rules-based summary, and a QA flag pass.
- Template loader for `templates/collections/*.md`. Files are not sent until `counselReviewed: true`.

## Not done

Full unmasked-file import, field-level SSN encryption and reveal, Reg F validation-notice generation, workflow builder, human approval queue for every AI draft, a live Stripe or other processor, Metro 2, MFA, and role-separated collector permissions. Provider adapters do not place real Twilio, Telnyx, Vapi, Retell, Lob, or SMS/email traffic.

## Owner still has to provide

Counsel review of the state table and recording-consent list, the Texas bond filing, FCC Reassigned Numbers Database access, written consent records, and sandbox or production keys only after the repo is private. No live key is required to run the desk.
