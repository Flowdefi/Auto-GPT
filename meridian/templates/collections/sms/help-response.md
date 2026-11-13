---
id: "SMS-008"
title: "SMS HELP Response"
channel: "sms"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
purpose: "Auto-reply to HELP keyword (CTIA)."
merge_fields: ["agency_hours", "agency_name", "agency_phone", "agency_website"]
required_disclosures: ["opt-out method"]
send_rules: ["Auto-reply only to HELP/INFO"]
legal_citations: ["CTIA Messaging Principles and Best Practices (STOP/HELP keywords)", "12 CFR 1006.6(e) (opt-out notice for electronic communications)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# SMS HELP Response

**Requires counsel review before use.**

{{agency_name}}: For help call {{agency_phone}} ({{agency_hours}}) or visit {{agency_website}}. Msg & data rates may apply. Reply STOP to opt out of texts.
