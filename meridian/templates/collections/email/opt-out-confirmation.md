---
id: "EML-006"
title: "Email Opt-Out Confirmation"
channel: "email"
status: "Requires counsel review before use"
needs_counsel_review: true
template_syntax: "mustache"
subject: "You've been unsubscribed"
purpose: "Confirms email opt-out. No collection content."
merge_fields: ["agency_mailing_address", "agency_name", "agency_phone", "masked_email"]
required_disclosures: []
send_rules: ["Send once; then suppress address on email channel"]
legal_citations: ["12 CFR 1006.6(e) (opt-out notice for electronic communications)", "12 CFR 1006.14(h) (prohibited communication media)"]
---
<!-- DRAFT TEMPLATE. Requires counsel review before use. Not legal advice. -->

# Email Opt-Out Confirmation

**Requires counsel review before use.**

**Subject:** You've been unsubscribed

Hello,

We've received your request. {{agency_name}} will no longer send emails to {{masked_email}}. If you'd like to reach us, call {{agency_phone}} or write to {{agency_mailing_address}}.

{{agency_name}}
