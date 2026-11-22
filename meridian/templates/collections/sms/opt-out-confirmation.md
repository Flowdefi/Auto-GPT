---
id: "SMS-007"
title: "SMS Opt-Out Confirmation"
channel: "sms"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Single confirmation after STOP. No collection content. Must be sent within 5 minutes and no further texts to that number."
merge_fields: ["agency_name", "agency_phone"]
required_disclosures: []
send_rules: ["Send once, within 5 minutes of the opt-out; contains no marketing or collection content (47 CFR 64.1200(a)(10) confirmation text)", "Suppress number on SMS immediately; log revocation"]
legal_citations: ["47 CFR 64.1200 (TCPA rules; (a)(10) consent revocation; (b) artificial-voice identification)", "FCC consent-revocation order, 2026-21821 (Fed. Reg. Oct. 26, 2026), revised 47 CFR 64.1200(a)(10) effective Nov. 25, 2026", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "CTIA Messaging Principles and Best Practices (STOP/HELP keywords)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# SMS Opt-Out Confirmation

**Requires counsel review before use.**

{{agency_name}}: You're unsubscribed and will get no more texts from us at this number. Questions: {{agency_phone}}.
