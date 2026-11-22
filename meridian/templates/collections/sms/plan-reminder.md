---
id: "SMS-004"
title: "SMS Plan Payment Reminder"
channel: "sms"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Upcoming scheduled plan payment, 3 days before due date (owner-configurable)."
merge_fields: ["agency_name", "agency_phone", "next_payment_amount", "next_payment_date", "portal_url"]
required_disclosures: ["1006.18(e)(2)", "opt-out method"]
send_rules: ["Number must satisfy 1006.6(d)(5) reasonable procedures (consumer-provided/consented number, no notice of reassignment) before ANY debt content is sent", "Autodialed/automated texts to cell phones need prior express consent (47 U.S.C. 227(b)); check reassigned-numbers database", "Send only 8 a.m.-9 p.m. consumer local time (1006.6(b)(1)); respect channel opt-outs (1006.14(h))", "Every text includes the opt-out method (1006.6(e)); honor STOP and synonyms per 47 CFR 64.1200(a)(10)", "10DLC/short-code campaign registration with carriers; CTIA HELP/STOP support"]
legal_citations: ["12 CFR 1006.6(d) (third-party communications; email/text reasonable procedures (d)(3)-(5))", "12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.6(b)(1) (inconvenient times/places; 8 a.m.-9 p.m. presumption)", "12 CFR 1006.14(h) (prohibited communication media)", "12 CFR 1006.18(e) (initial/subsequent communication disclosures)", "47 U.S.C. 227 (TCPA)", "47 CFR 64.1200 (TCPA rules; (a)(10) consent revocation; (b) artificial-voice identification)", "FCC consent-revocation order, 2026-21821 (Fed. Reg. Oct. 26, 2026), revised 47 CFR 64.1200(a)(10) effective Nov. 25, 2026", "CTIA Messaging Principles and Best Practices (STOP/HELP keywords)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# SMS Plan Payment Reminder

**Requires counsel review before use.**

{{agency_name}}, a debt collector: Reminder: your plan payment of ${{next_payment_amount}} is scheduled for {{next_payment_date}}. Need to change it? {{portal_url}} or {{agency_phone}}. Reply STOP to opt out of texts.
